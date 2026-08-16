import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { Button, EmptyState, Sheet, TextField } from '../../src/components/ui';
import { apiFetch } from '../../src/lib/api';
import { writeCoach } from '../../src/lib/coach';
import { RootState } from '../../src/store';
import {
  enqueueOutbox,
  getMirroredPrices,
  listOutbox,
  mirrorPrices,
  newOutboxId,
  removeOutbox,
} from '../../src/lib/offline';

type Store = { id: string; name: string };
type Deal = { itemName: string; lowestPrice: number; averagePrice: number };
type HistoryEntry = {
  id: string;
  price: number;
  recordedAt: string;
  Store?: { id: string; name: string } | null;
};

export default function PricesScreen() {
  const router = useRouter();
  const { accessToken, householdId } = useSelector((s: RootState) => s.auth);
  const [storeName, setStoreName] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyItem, setHistoryItem] = useState('');
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const net = await Network.getNetworkStateAsync();
    const isOnline = Boolean(net.isConnected);
    setOnline(isOnline);

    if (!isOnline) {
      const mirroredStores = await getMirroredPrices<Store>('stores');
      const mirroredDeals = await getMirroredPrices<Deal & { id: string }>('deals');
      setStores(mirroredStores);
      setDeals(mirroredDeals);
      setStoreId((prev) => prev || mirroredStores[0]?.id || '');
      setLoading(false);
      return;
    }

    const queue = await listOutbox();
    for (const entry of queue) {
      if (!entry.path.startsWith('/prices')) continue;
      await apiFetch(entry.path, {
        method: entry.method,
        token: accessToken,
        body: entry.body ?? undefined,
      });
      await removeOutbox(entry.id);
    }

    const s = await apiFetch<{ stores: Store[] }>(
      `/prices/stores${householdId ? `?householdId=${householdId}` : ''}`,
      { token: accessToken },
    );
    if (s.success) {
      setStores(s.data.stores);
      setStoreId((prev) => prev || s.data.stores[0]?.id || '');
      await mirrorPrices('stores', s.data.stores);
    } else {
      setError(s.error.message);
    }
    const d = await apiFetch<{ deals: Deal[] }>(
      `/prices/deals${householdId ? `?householdId=${householdId}` : ''}`,
      { token: accessToken },
    );
    if (d.success) {
      setDeals(d.data.deals);
      await mirrorPrices(
        'deals',
        d.data.deals.map((deal, index) => ({
          ...deal,
          id: `${deal.itemName}-${index}`,
        })),
      );
    }
    setLoading(false);
  }, [accessToken, householdId]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const net = await Network.getNetworkStateAsync();
        setOnline(Boolean(net.isConnected));
      })();
      const netSub = Network.addNetworkStateListener((state) => {
        setOnline(Boolean(state.isConnected));
      });
      load();
      return () => netSub.remove();
    }, [load]),
  );

  const selectedStoreName = stores.find((s) => s.id === storeId)?.name;

  const handleCreateStore = async () => {
    if (!accessToken || !storeName.trim()) return;
    const result = await apiFetch<{ store: Store }>('/prices/stores', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ name: storeName.trim(), householdId }),
    });
    if (!result.success) return;
    await writeCoach({ recordedPrice: true });
    setStoreName('');
    setStoreId(result.data.store.id);
    await load();
  };

  const loadHistory = async (name: string) => {
    if (!accessToken) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setHistory([]);
      setHistoryItem('');
      return;
    }
    setHistoryLoading(true);
    setHistoryItem(trimmed);
    const result = await apiFetch<{ history: HistoryEntry[] }>(
      `/prices/items/${encodeURIComponent(trimmed)}/history${
        householdId ? `?householdId=${householdId}` : ''
      }`,
      { token: accessToken },
    );
    setHistoryLoading(false);
    if (!result.success) {
      setHistory([]);
      return;
    }
    setHistory(result.data.history);
  };

  const handleAddPrice = async () => {
    if (!accessToken || !storeId || !itemName.trim() || !price) return;
    const path = `/prices/items/${encodeURIComponent(itemName.trim())}/stores/${storeId}`;
    const body = {
      price: Number(price),
      householdId,
      category: category.trim() || null,
    };
    if (!online) {
      await enqueueOutbox({
        id: newOutboxId(),
        method: 'PUT',
        path,
        body,
      });
      const recordedName = itemName.trim();
      setItemName('');
      setCategory('');
      setPrice('');
      Alert.alert('Queued', 'Price will sync when you are online');
      void recordedName;
      return;
    }
    const result = await apiFetch(path, {
      method: 'PUT',
      token: accessToken,
      body: JSON.stringify(body),
    });
    if (!result.success) return;
    await writeCoach({ recordedPrice: true });
    const recordedName = itemName.trim();
    setItemName('');
    setCategory('');
    setPrice('');
    await load();
    await loadHistory(recordedName);
  };

  return (
    <View className="flex-1 bg-surface dark:bg-ink px-4 py-4">
      {!online ? (
        <View className="-mx-4 mb-3 bg-citrus px-4 py-2">
          <Text className="font-ui-medium text-ink">
            Offline — showing cached prices · records sync later
          </Text>
        </View>
      ) : null}
      <Text className="font-display text-2xl text-ink dark:text-sage">Price memory</Text>
      <Text className="mb-3 font-ui text-ink-muted dark:text-sage/80">
        Your household prices only — no fake scrapers.
      </Text>

      {error ? (
        <EmptyState title="Could not load prices" description={error} actionLabel="Retry" onAction={load} />
      ) : null}

      {loading ? (
        <Text className="mb-2 font-ui text-ink-muted dark:text-sage/80">Loading…</Text>
      ) : null}

      <TextField label="Store name" value={storeName} onChangeText={setStoreName} />
      <Button label="Add store" onPress={handleCreateStore} />

      <View className="mb-2 mt-3 gap-2 rounded-xl bg-sage px-3 py-3">
        <Text className="font-ui-medium text-sm text-ink-muted dark:text-sage/80">
          Store for this price
        </Text>
        <Text className="font-ui-bold text-ink dark:text-sage">
          {selectedStoreName || 'None selected'}
        </Text>
        <Button label="Choose store" variant="secondary" onPress={() => setStorePickerOpen(true)} />
      </View>

      <TextField label="Item" value={itemName} onChangeText={setItemName} />
      <TextField
        label="Category (optional)"
        value={category}
        onChangeText={setCategory}
        placeholder="Produce, Dairy, …"
      />
      <TextField label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <View className="mb-2 gap-2">
        <Button label="Record price" variant="secondary" onPress={handleAddPrice} />
        <Button
          label="Show history"
          variant="ghost"
          onPress={() => loadHistory(itemName)}
        />
      </View>

      {historyLoading ? (
        <Text className="font-ui text-ink-muted dark:text-sage/80">Loading history…</Text>
      ) : null}
      {!historyLoading && historyItem ? (
        <View className="mb-3 gap-2">
          <Text className="font-ui-bold text-ink dark:text-sage">History · {historyItem}</Text>
          {history.length === 0 ? (
            <Text className="font-ui text-ink-muted dark:text-sage/80">
              No recorded prices for this item yet.
            </Text>
          ) : (
            history.map((entry) => (
              <Text
                key={entry.id}
                className="border-b border-border py-2 font-ui text-ink dark:text-sage"
              >
                ${Number(entry.price).toFixed(2)} · {entry.Store?.name || 'Unknown'} ·{' '}
                {new Date(entry.recordedAt).toLocaleDateString()}
              </Text>
            ))
          )}
        </View>
      ) : null}

      <FlatList
        className="mt-2"
        data={deals}
        keyExtractor={(item) => item.itemName}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              title="No deals yet"
              description="Add a store, pick it below, then record a few prices."
              actionLabel="Choose store"
              onAction={() => setStorePickerOpen(true)}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Show history for ${item.itemName}`}
            onPress={() => {
              setItemName(item.itemName);
              void loadHistory(item.itemName);
            }}
            className="border-b border-border py-3"
          >
            <Text className="font-ui text-ink dark:text-sage">
              {item.itemName}: low ${item.lowestPrice.toFixed(2)} (avg ${item.averagePrice.toFixed(2)})
            </Text>
          </Pressable>
        )}
      />

      <Button
        label="Open Insights"
        variant="ghost"
        onPress={() => router.push('/(app)/insights')}
      />

      <Sheet visible={storePickerOpen} title="Choose store" onClose={() => setStorePickerOpen(false)}>
        {stores.length === 0 ? (
          <Text className="font-ui text-ink-muted dark:text-sage/80">Add a store above first.</Text>
        ) : (
          stores.map((store) => (
            <Button
              key={store.id}
              label={store.name}
              variant={store.id === storeId ? 'primary' : 'secondary'}
              onPress={() => {
                setStoreId(store.id);
                setStorePickerOpen(false);
              }}
            />
          ))
        )}
      </Sheet>
    </View>
  );
}
