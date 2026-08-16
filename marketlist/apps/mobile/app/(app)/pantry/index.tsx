import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, SectionList, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { Button, EmptyState, ListRow, Sheet, TextField } from '../../../src/components/ui';
import { apiFetch } from '../../../src/lib/api';
import { RootState } from '../../../src/store';
import { getMirroredPantry, mirrorPantry } from '../../../src/lib/offline';
import { writeCoach } from '../../../src/lib/coach';

type Pantry = {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string | null;
  lowStockThreshold: number | null;
  unit?: string | null;
};

type Section = { title: string; data: Pantry[] };

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDate = (value: string) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function PantryScreen() {
  const router = useRouter();
  const { accessToken, householdId } = useSelector((s: RootState) => s.auth);
  const [items, setItems] = useState<Pantry[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [editItem, setEditItem] = useState<Pantry | null>(null);
  const [editQty, setEditQty] = useState('1');
  const [editExpiry, setEditExpiry] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [pickForId, setPickForId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const addFieldRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!householdId) return;
    const net = await Network.getNetworkStateAsync();
    const isOnline = Boolean(net.isConnected);
    setOnline(isOnline);

    if (!isOnline || !accessToken) {
      const mirrored = await getMirroredPantry<Pantry>(householdId);
      setItems(mirrored);
      return;
    }

    const pantry = await apiFetch<{ items: Pantry[] }>(`/pantry?householdId=${householdId}`, {
      token: accessToken,
    });
    if (pantry.success) {
      setItems(pantry.data.items);
      await mirrorPantry(householdId, pantry.data.items);
    }
    const listRes = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
      `/lists?householdId=${householdId}`,
      { token: accessToken },
    );
    if (listRes.success) setLists(listRes.data.lists);
  }, [accessToken, householdId]);

  useFocusEffect(
    useCallback(() => {
      void writeCoach({ visitedPantry: true });
      void (async () => {
        const net = await Network.getNetworkStateAsync();
        setOnline(Boolean(net.isConnected));
      })();
      const netSub = Network.addNetworkStateListener((state) => {
        const connected = Boolean(state.isConnected);
        setOnline(connected);
        if (connected) void load();
      });
      load();
      return () => netSub.remove();
    }, [load]),
  );

  const sections = useMemo((): Section[] => {
    const today = todayStart();
    const soonLimit = new Date(today);
    soonLimit.setDate(soonLimit.getDate() + 5);
    const q = search.trim().toLowerCase();

    const expired: Pantry[] = [];
    const soon: Pantry[] = [];
    const low: Pantry[] = [];
    const stocked: Pantry[] = [];

    for (const item of items) {
      if (q) {
        const hay = `${item.name} ${item.unit || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      const threshold = item.lowStockThreshold;
      const isLow =
        threshold !== null &&
        threshold !== undefined &&
        Number(item.quantity) <= Number(threshold);

      if (item.expiryDate) {
        const expiry = parseDate(item.expiryDate);
        if (expiry < today) {
          expired.push(item);
          continue;
        }
        if (expiry <= soonLimit) {
          soon.push(item);
          continue;
        }
      }

      if (isLow) {
        low.push(item);
        continue;
      }
      stocked.push(item);
    }

    return [
      { title: 'Expired', data: expired },
      { title: 'Expiring soon', data: soon },
      { title: 'Low stock', data: low },
      { title: 'Stocked', data: stocked },
    ].filter((s) => s.data.length > 0);
  }, [items, search]);

  const handleAdd = async () => {
    if (!online || !accessToken || !householdId || !name.trim()) return;
    const result = await apiFetch('/pantry', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ householdId, name: name.trim(), quantity: 1 }),
    });
    if (!result.success) return;
    await writeCoach({ addedPantry: true });
    setName('');
    await load();
  };

  const openEdit = (item: Pantry) => {
    if (!online) return;
    setEditItem(item);
    setEditQty(String(item.quantity ?? 1));
    setEditExpiry(item.expiryDate || '');
    setEditThreshold(
      item.lowStockThreshold === null || item.lowStockThreshold === undefined
        ? ''
        : String(item.lowStockThreshold),
    );
  };

  const handleSaveEdit = async () => {
    if (!online || !accessToken || !editItem) return;
    const qty = Number(editQty);
    const threshold = editThreshold.trim() === '' ? null : Number(editThreshold);
    const result = await apiFetch(`/pantry/${editItem.id}`, {
      method: 'PUT',
      token: accessToken,
      body: JSON.stringify({
        quantity: Number.isFinite(qty) ? qty : editItem.quantity,
        expiryDate: editExpiry.trim() || null,
        lowStockThreshold: threshold !== null && Number.isFinite(threshold) ? threshold : null,
      }),
    });
    if (!result.success) return;
    await writeCoach({ addedPantry: true });
    setEditItem(null);
    await load();
  };

  const handleDelete = async () => {
    if (!online || !accessToken || !editItem) return;
    await apiFetch(`/pantry/${editItem.id}`, {
      method: 'DELETE',
      token: accessToken,
    });
    setEditItem(null);
    await load();
  };

  const handleAddToList = async (listId: string) => {
    if (!online || !accessToken || !pickForId) return;
    await apiFetch(`/pantry/${pickForId}/add-to-list`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ listId }),
    });
    const listName = lists.find((l) => l.id === listId)?.name || 'list';
    setPickForId(null);
    Alert.alert('Added', `Added to ${listName}`);
  };

  if (!householdId) {
    return (
      <View className="flex-1 bg-surface dark:bg-surface-dark">
        <EmptyState
          title="No household"
          description="Set up a household in Settings to sync your pantry."
          actionLabel="Open settings"
          onAction={() => router.push('/(app)/settings')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      {!online ? (
        <View className="bg-citrus px-4 py-2">
          <Text className="font-ui-medium text-ink">Offline — showing mirrored pantry</Text>
        </View>
      ) : null}
      <View className="gap-3 border-b border-border px-4 py-4 dark:border-border-dark">
        <Text className="font-display text-2xl text-ink dark:text-ink-on-dark">Pantry</Text>
        <TextField
          label="Search pantry"
          value={search}
          onChangeText={setSearch}
          placeholder="Filter by name…"
          accessibilityLabel="Search pantry items"
        />
        <TextField
          ref={addFieldRef}
          label="Pantry item"
          value={name}
          onChangeText={setName}
          editable={online}
        />
        <Button label="Add to pantry" onPress={handleAdd} disabled={!online || !name.trim()} />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <EmptyState
            title={search.trim() ? 'No matching items' : 'Pantry is empty'}
            description={
              search.trim()
                ? 'Try a different search, or clear the filter.'
                : online
                  ? 'Use Add to pantry above to track staples at home.'
                  : 'Connect to add pantry items. Mirrored items appear when available.'
            }
            actionLabel={
              search.trim() ? 'Clear search' : online ? 'Add an item' : undefined
            }
            onAction={
              search.trim()
                ? () => setSearch('')
                : online
                  ? () => addFieldRef.current?.focus()
                  : undefined
            }
          />
        }
        renderSectionHeader={({ section }) => (
          <Text className="bg-sage-deep/40 px-4 py-2 font-ui-bold text-sm text-ink-muted dark:bg-surface-dark-elevated dark:text-ink-muted-dark">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={`Qty ${item.quantity}${item.expiryDate ? ` · exp ${item.expiryDate}` : ''}${
              item.lowStockThreshold != null ? ` · low ≤ ${item.lowStockThreshold}` : ''
            }`}
            onPress={online ? () => openEdit(item) : undefined}
            right={
              <Button
                label="To list"
                variant="ghost"
                disabled={!online}
                onPress={() => {
                  if (!online) return;
                  if (lists.length === 0) {
                    Alert.alert('Create a list first');
                    return;
                  }
                  setPickForId(item.id);
                }}
              />
            }
          />
        )}
      />

      <Sheet visible={Boolean(editItem)} title="Edit pantry item" onClose={() => setEditItem(null)}>
        <Text className="font-ui-medium text-base text-ink dark:text-ink-on-dark">
          {editItem?.name}
        </Text>
        <TextField
          label="Quantity"
          value={editQty}
          onChangeText={setEditQty}
          keyboardType="decimal-pad"
          editable={online}
        />
        <TextField
          label="Expiry (YYYY-MM-DD)"
          value={editExpiry}
          onChangeText={setEditExpiry}
          placeholder="2026-07-20"
          autoCapitalize="none"
          editable={online}
        />
        <TextField
          label="Low stock threshold"
          value={editThreshold}
          onChangeText={setEditThreshold}
          keyboardType="decimal-pad"
          placeholder="1"
          editable={online}
        />
        <Button label="Save" onPress={handleSaveEdit} disabled={!online} />
        <Button label="Delete" variant="danger" onPress={handleDelete} disabled={!online} />
      </Sheet>

      <Sheet
        visible={Boolean(pickForId)}
        title="Add to which list?"
        onClose={() => setPickForId(null)}
      >
        {lists.map((list) => (
          <Button
            key={list.id}
            label={list.name}
            variant="secondary"
            disabled={!online}
            onPress={() => handleAddToList(list.id)}
          />
        ))}
      </Sheet>
    </View>
  );
}
