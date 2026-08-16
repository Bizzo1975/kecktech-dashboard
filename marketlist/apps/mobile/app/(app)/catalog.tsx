import React, { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { Button, EmptyState, TextField } from '../../src/components/ui';
import { apiFetch } from '../../src/lib/api';
import { writeCoach } from '../../src/lib/coach';
import { RootState } from '../../src/store';
import {
  enqueueOutbox,
  getMirroredCatalog,
  listOutbox,
  mirrorCatalog,
  newOutboxId,
  removeOutbox,
} from '../../src/lib/offline';

type CatalogItem = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
};

export default function CatalogScreen() {
  const { accessToken } = useSelector((s: RootState) => s.auth);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (q = '') => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      const net = await Network.getNetworkStateAsync();
      const isOnline = Boolean(net.isConnected);
      setOnline(isOnline);

      if (!isOnline) {
        const mirrored = await getMirroredCatalog<CatalogItem>();
        const query = q.trim().toLowerCase();
        setItems(
          query
            ? mirrored.filter(
                (item) =>
                  item.name.toLowerCase().includes(query) ||
                  (item.category || '').toLowerCase().includes(query),
              )
            : mirrored,
        );
        setLoading(false);
        return;
      }

      const queue = await listOutbox();
      for (const entry of queue) {
        if (!entry.path.startsWith('/catalog')) continue;
        await apiFetch(entry.path, {
          method: entry.method,
          token: accessToken,
          body: entry.body ?? undefined,
        });
        await removeOutbox(entry.id);
      }

      const query = q.trim();
      const path = query
        ? `/catalog/items?search=${encodeURIComponent(query)}&limit=100`
        : '/catalog/items?limit=100';
      const result = await apiFetch<{ items: CatalogItem[] }>(path, { token: accessToken });
      setLoading(false);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setItems(result.data.items);
      if (!query) await mirrorCatalog(result.data.items);
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const net = await Network.getNetworkStateAsync();
        setOnline(Boolean(net.isConnected));
      })();
      const netSub = Network.addNetworkStateListener((state) => {
        setOnline(Boolean(state.isConnected));
      });
      void load('');
      return () => netSub.remove();
    }, [load]),
  );

  const handleAdd = async () => {
    if (!accessToken || !name.trim()) return;
    const body = {
      name: name.trim(),
      category: category.trim() || undefined,
    };
    if (!online) {
      const optimistic: CatalogItem = {
        id: `local-catalog-${Date.now()}`,
        name: body.name,
        category: body.category || null,
      };
      const next = [optimistic, ...items];
      setItems(next);
      await mirrorCatalog(next);
      await enqueueOutbox({
        id: newOutboxId(),
        method: 'POST',
        path: '/catalog/items',
        body,
      });
      setName('');
      setCategory('');
      return;
    }
    const result = await apiFetch<{ item: CatalogItem }>('/catalog/items', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify(body),
    });
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setName('');
    setCategory('');
    await writeCoach({ usedCatalog: true });
    await load(search);
  };

  return (
    <View className="flex-1 bg-surface dark:bg-ink">
      {!online ? (
        <View className="bg-citrus px-4 py-2">
          <Text className="font-ui-medium text-ink">
            Offline — showing cached catalog · adds sync later
          </Text>
        </View>
      ) : null}

      <View className="gap-3 border-b border-border px-4 py-4">
        <Text className="font-display text-2xl text-ink dark:text-sage">Catalog</Text>
        <Text className="font-ui text-ink-muted dark:text-sage/80">
          Items here feed list typeahead. Add staples so suggestions appear while shopping.
        </Text>
        <TextField
          label="Search"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => void load(search)}
          returnKeyType="search"
        />
        <Button label="Search catalog" variant="secondary" onPress={() => void load(search)} />
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField
          label="Category"
          value={category}
          onChangeText={setCategory}
          placeholder="Dairy, Produce…"
        />
        <Button label="Add to catalog" onPress={handleAdd} disabled={!name.trim()} />
      </View>

      {error ? (
        <EmptyState title="Could not load catalog" description={error} actionLabel="Retry" onAction={() => void load()} />
      ) : null}

      {loading ? (
        <Text className="px-4 py-3 font-ui text-ink-muted dark:text-sage/80">Loading…</Text>
      ) : null}

      <FlatList
        className="px-4"
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              title="No catalog items"
              description="Add a name and category above. Typeahead on lists pulls from this catalog."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View className="border-b border-border py-3">
            <Text className="font-ui-medium text-base text-ink dark:text-sage">{item.name}</Text>
            {item.category ? (
              <Text className="font-ui text-sm text-ink-muted dark:text-sage/70">{item.category}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
