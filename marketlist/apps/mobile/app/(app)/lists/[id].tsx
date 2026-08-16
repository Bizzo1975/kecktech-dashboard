import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  FlatList,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { AISLE_SECTIONS, aisleSortIndex } from '@marketlist/shared';
import * as Network from 'expo-network';
import { MotiView } from '../../../src/lib/motion';
import {
  AddFlash,
  Button,
  CheckAffordance,
  EmptyState,
  Sheet,
  SyncPulse,
  TextField,
  Toast,
} from '../../../src/components/ui';
import { apiFetch } from '../../../src/lib/api';
import { RootState } from '../../../src/store';
import { getSocket } from '../../../src/lib/socket';
import {
  enqueueOutbox,
  getMirroredListItems,
  listOutbox,
  mirrorListItems,
  removeOutbox,
} from '../../../src/lib/offline';
import { writeCoach } from '../../../src/lib/coach';
import { markFirstTrip, writeActivation } from '../../../src/lib/activation';
import { scheduleTripReminder } from '../../../src/lib/notifications';
import { writeActiveListWidgetSnapshot } from '../../../src/lib/widgetBridge';

type SortMode = 'aisle' | 'category' | 'custom';

type Item = {
  id: string;
  name: string;
  aisleSection: string | null;
  category: string | null;
  checked: boolean;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
  sortOrder?: number | null;
  createdAt?: string;
  assigneeUserId?: string | null;
};

type Member = { id: string; name: string; email: string; role: string };

type Suggestion = {
  name: string;
  source: 'memory' | 'pantry' | 'catalog';
  category: string | null;
  aisleSection: string | null;
  quantity: number;
  unit: string | null;
};

type StoreRow = { id: string; name: string };

const SOURCE_LABEL: Record<Suggestion['source'], string> = {
  memory: 'Recent',
  pantry: 'Pantry',
  catalog: 'Catalog',
};

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, householdId, user } = useSelector((s: RootState) => s.auth);
  const [items, setItems] = useState<Item[]>([]);
  const [listName, setListName] = useState('List');
  const [sortMode, setSortMode] = useState<SortMode>('aisle');
  const [listType, setListType] = useState<'shopping' | 'template'>('shopping');
  const [draft, setDraft] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<{ label: string; run: () => void } | null>(null);
  const [undoCheckItem, setUndoCheckItem] = useState<Item | null>(null);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editUnit, setEditUnit] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAisle, setEditAisle] = useState<string>('Other');
  const [editAssignee, setEditAssignee] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [myItemsOnly, setMyItemsOnly] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamingBusy, setRenamingBusy] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [tripStoreId, setTripStoreId] = useState<string | null>(null);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [postTrip, setPostTrip] = useState<{
    checkedCount: number;
    pantryCount: number;
  } | null>(null);
  const [estimate, setEstimate] = useState<{
    estimatedTotal: number;
    pricedCount: number;
    unknownCount: number;
    note: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addFieldRef = useRef<TextInput>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const checkedCount = useMemo(() => items.filter((i) => i.checked).length, [items]);
  const remainingCount = useMemo(() => items.filter((i) => !i.checked).length, [items]);

  const showToast = useCallback((message: string, action?: { label: string; run: () => void }) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    setToastAction(action || null);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      setToastAction(null);
    }, action ? 5000 : 3000);
  }, []);

  const persistMirror = useCallback(
    async (next: Item[]) => {
      if (!id) return;
      await mirrorListItems(id, next);
    },
    [id],
  );

  const flushOutbox = useCallback(async () => {
    if (!accessToken) return;
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected) return;
    const queue = await listOutbox();
    if (queue.length === 0) return;
    setSyncing(true);
    for (const entry of queue) {
      await apiFetch(entry.path, {
        method: entry.method,
        token: accessToken,
        body: entry.body ?? undefined,
      });
      await removeOutbox(entry.id);
    }
    setSyncing(false);
  }, [accessToken]);

  const loadStores = useCallback(async () => {
    if (!accessToken || !householdId) {
      setStores([]);
      return;
    }
    const result = await apiFetch<{ stores: StoreRow[] }>(
      `/prices/stores?householdId=${householdId}`,
      { token: accessToken },
    );
    if (result.success) setStores(result.data.stores);
  }, [accessToken, householdId]);

  const loadMembers = useCallback(async () => {
    if (!accessToken || !householdId) {
      setMembers([]);
      return;
    }
    const result = await apiFetch<{ members: Member[] }>(`/households/${householdId}/members`, {
      token: accessToken,
    });
    if (result.success) setMembers(result.data.members);
  }, [accessToken, householdId]);

  const load = useCallback(async () => {
    if (!id) return;
    const net = await Network.getNetworkStateAsync();
    const isOnline = Boolean(net.isConnected);
    setOnline(isOnline);

    if (!isOnline || !accessToken) {
      const mirrored = await getMirroredListItems<Item>(id);
      if (mirrored.length) setItems(mirrored);
      return;
    }

    await flushOutbox();
    const result = await apiFetch<{
      list: { name: string; sortMode?: SortMode; type?: string; items: Item[]; householdId?: string };
    }>(`/lists/${id}`, { token: accessToken });
    if (result.success) {
      setListName(result.data.list.name);
      const mode = result.data.list.sortMode;
      setSortMode(mode === 'category' || mode === 'custom' ? mode : 'aisle');
      setListType(result.data.list.type === 'template' ? 'template' : 'shopping');
      const next = result.data.list.items || [];
      setItems(next);
      await persistMirror(next);
      const remaining = next.filter((i) => !i.checked).length;
      if (user?.notificationPrefs?.notifyTripReminder) {
        await scheduleTripReminder({
          enabled: true,
          remainingCount: remaining,
          listName: result.data.list.name,
        });
      }
      await writeActiveListWidgetSnapshot({
        updatedAt: new Date().toISOString(),
        activeListCount: 1,
        uncheckedItemCount: remaining,
        primaryListName: result.data.list.name,
        primaryListId: id,
      });
      const estimateRes = await apiFetch<{
        estimatedTotal: number;
        pricedCount: number;
        unknownCount: number;
        note: string;
      }>(`/lists/${id}/estimate`, { token: accessToken });
      if (estimateRes.success && estimateRes.data.pricedCount > 0) {
        setEstimate(estimateRes.data);
      } else {
        setEstimate(null);
      }
    }
    await loadStores();
    await loadMembers();
  }, [
    accessToken,
    flushOutbox,
    id,
    loadMembers,
    loadStores,
    persistMirror,
    user?.notificationPrefs?.notifyTripReminder,
  ]);

  useFocusEffect(
    useCallback(() => {
      void writeCoach({ openedList: true });
      if (id) void writeActivation({ defaultListId: id });
      load();
      const socket = getSocket();
      const handler = () => {
        setSyncing(true);
        load().finally(() => {
          setTimeout(() => setSyncing(false), 600);
        });
      };
      socket?.on('item:updated', handler);
      socket?.on('list:updated', handler);
      const netSub = Network.addNetworkStateListener((state) => {
        const connected = Boolean(state.isConnected);
        setOnline(connected);
        if (connected) {
          flushOutbox().then(() => load());
        }
      });
      return () => {
        socket?.off('item:updated', handler);
        socket?.off('list:updated', handler);
        netSub.remove();
      };
    }, [flushOutbox, load]),
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!draft.trim() || !accessToken || !householdId || !online) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const result = await apiFetch<{ suggestions: Suggestion[] }>(
        `/items/suggest?householdId=${householdId}&q=${encodeURIComponent(draft.trim())}`,
        { token: accessToken },
      );
      if (result.success) setSuggestions(result.data.suggestions);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [accessToken, draft, householdId, online]);

  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (myItemsOnly && user?.id && item.assigneeUserId !== user.id) return false;
      if (!q) return true;
      const assigneeName =
        members.find((m) => m.id === item.assigneeUserId)?.name?.toLowerCase() || '';
      const hay =
        `${item.name} ${item.category || ''} ${item.aisleSection || ''} ${item.notes || ''} ${item.unit || ''} ${assigneeName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [filterQuery, items, members, myItemsOnly, user?.id]);

  const sorted = useMemo(() => {
    const next = [...filtered];
    next.sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      if (sortMode === 'category') {
        const catCmp = (a.category || 'Other').localeCompare(b.category || 'Other');
        if (catCmp !== 0) return catCmp;
        return a.name.localeCompare(b.name);
      }
      if (sortMode === 'custom') {
        const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        if (aTime !== bTime) return aTime - bTime;
        return a.name.localeCompare(b.name);
      }
      const aisleCmp =
        aisleSortIndex(a.aisleSection || 'Other') - aisleSortIndex(b.aisleSection || 'Other');
      if (aisleCmp !== 0) return aisleCmp;
      return a.name.localeCompare(b.name);
    });
    return next;
  }, [filtered, sortMode]);

  const sectionLabel = (item: Item) => {
    if (sortMode === 'category') return item.category || 'Other';
    if (sortMode === 'custom') return 'Your order';
    return item.aisleSection || 'Other';
  };

  const rows = useMemo(() => {
    const out: Array<{ kind: 'header'; title: string } | { kind: 'item'; item: Item }> = [];
    let lastSection = '';
    let showedChecked = false;
    for (const item of sorted) {
      if (item.checked) {
        if (!showedChecked) {
          out.push({ kind: 'header', title: 'Checked' });
          showedChecked = true;
        }
        out.push({ kind: 'item', item });
        continue;
      }
      if (sortMode === 'custom') {
        out.push({ kind: 'item', item });
        continue;
      }
      const section = sectionLabel(item);
      if (section !== lastSection) {
        out.push({ kind: 'header', title: section });
        lastSection = section;
      }
      out.push({ kind: 'item', item });
    }
    return out;
  }, [sorted, sortMode]);

  const runOrEnqueue = async (method: string, path: string, body?: unknown) => {
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected) {
      await enqueueOutbox({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        method,
        path,
        body,
      });
      showToast('Saved offline — will sync later');
      return false;
    }
    if (!accessToken) return false;
    await apiFetch(path, {
      method,
      token: accessToken,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return true;
  };

  const handleAdd = async (payload?: {
    name: string;
    quantity?: number;
    category?: string | null;
    aisleSection?: string | null;
    unit?: string | null;
  }) => {
    if (!id) return;
    const name = (payload?.name || draft).trim();
    if (!name) return;
    const body = {
      name,
      quantity: payload?.quantity ?? 1,
      category: payload?.category || undefined,
      aisleSection: payload?.aisleSection || undefined,
      unit: payload?.unit || undefined,
    };
    setDraft('');
    setSuggestions([]);
    setFlashKey((k) => k + 1);
    void writeCoach({ addedItem: true });
    const synced = await runOrEnqueue('POST', `/lists/${id}/items`, body);
    if (synced) await load();
    else {
      const optimistic: Item = {
        id: `local-${Date.now()}`,
        name,
        quantity: body.quantity,
        checked: false,
        aisleSection: body.aisleSection || 'Other',
        category: body.category || null,
        unit: body.unit || null,
      };
      const next = [...items, optimistic];
      setItems(next);
      await persistMirror(next);
    }
  };

  const handleToggle = async (item: Item) => {
    if (!id) return;
    const nextChecked = !item.checked;
    const next = items.map((i) => (i.id === item.id ? { ...i, checked: nextChecked } : i));
    setItems(next);
    await persistMirror(next);
    if (nextChecked) {
      setUndoCheckItem(item);
      void writeCoach({ checkedItem: true });
      showToast(`Checked off ${item.name}`, {
        label: 'Undo',
        run: () => {
          void handleUndoCheck(item);
        },
      });
    }
    await runOrEnqueue('PUT', `/lists/${id}/items/${item.id}`, { checked: nextChecked });
  };

  const handleUndoCheck = async (item?: Item) => {
    const target = item || undoCheckItem;
    if (!target || !id) return;
    const next = items.map((i) => (i.id === target.id ? { ...i, checked: false } : i));
    setItems(next);
    await persistMirror(next);
    await runOrEnqueue('PUT', `/lists/${id}/items/${target.id}`, { checked: false });
    setUndoCheckItem(null);
    setToast(null);
    setToastAction(null);
  };

  const openEdit = (item: Item) => {
    setEditItem(item);
    setEditName(item.name);
    setEditQty(item.quantity || 1);
    setEditUnit(item.unit || '');
    setEditNotes(item.notes || '');
    setEditAisle(item.aisleSection || 'Other');
    setEditAssignee(item.assigneeUserId || '');
  };

  const handleSaveEdit = async () => {
    if (!editItem || !id) return;
    const body = {
      name: editName.trim() || editItem.name,
      quantity: Math.max(0.1, editQty),
      unit: editUnit.trim() || null,
      notes: editNotes.trim() || null,
      aisleSection: editAisle,
      assigneeUserId: editAssignee || null,
    };
    const next = items.map((i) =>
      i.id === editItem.id
        ? {
            ...i,
            name: body.name,
            quantity: body.quantity,
            unit: body.unit,
            notes: body.notes,
            aisleSection: body.aisleSection,
            assigneeUserId: body.assigneeUserId,
          }
        : i,
    );
    setItems(next);
    await persistMirror(next);
    setEditItem(null);
    const synced = await runOrEnqueue('PUT', `/lists/${id}/items/${editItem.id}`, body);
    if (synced) await load();
  };

  const handleDeleteEdit = async () => {
    if (!editItem || !id) return;
    const snapshot = { ...editItem };
    const next = items.filter((i) => i.id !== editItem.id);
    setItems(next);
    await persistMirror(next);
    setEditItem(null);
    await runOrEnqueue('DELETE', `/lists/${id}/items/${snapshot.id}`);
    showToast(`Deleted ${snapshot.name}`, {
      label: 'Undo',
      run: () => {
        void (async () => {
          const recreateBody = {
            name: snapshot.name,
            quantity: snapshot.quantity || 1,
            unit: snapshot.unit || undefined,
            notes: snapshot.notes || undefined,
            category: snapshot.category || undefined,
            aisleSection: snapshot.aisleSection || undefined,
          };
          const synced = await runOrEnqueue('POST', `/lists/${id}/items`, recreateBody);
          if (synced) await load();
          else {
            const restored = [...next, { ...snapshot, id: `local-${Date.now()}`, checked: false }];
            setItems(restored);
            await persistMirror(restored);
          }
          setToast(null);
          setToastAction(null);
        })();
      },
    });
  };

  const runCompleteTrip = async (storeId?: string | null) => {
    if (!id || !accessToken) return;
    const resolvedStoreId = storeId === undefined ? tripStoreId : storeId;
    setCompleting(true);
    const result = await apiFetch<{
      checkedCount: number;
      remainingCount: number;
      pantryUpserts: Array<{ name: string }>;
    }>(`/lists/${id}/complete`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        addCheckedToPantry: true,
        storeId: resolvedStoreId || undefined,
        recordPricesFromMemory: true,
      }),
    });
    setCompleting(false);
    if (!result.success) {
      Alert.alert('Could not complete trip', result.error.message);
      return;
    }
    const pantryN = result.data.pantryUpserts?.length ?? 0;
    await markFirstTrip();
    await writeCoach({
      completedTrip: true,
      ...(pantryN > 0 ? { addedPantry: true } : {}),
    });
    setPostTrip({
      checkedCount: result.data.checkedCount,
      pantryCount: pantryN,
    });
    await load();
  };

  const handleCompleteTrip = () => {
    if (checkedCount < 1) return;
    const proceed = () => {
      if (stores.length > 0) {
        setStorePickerOpen(true);
        return;
      }
      void runCompleteTrip(null);
    };
    if (remainingCount > 0) {
      Alert.alert(
        'Finish trip?',
        `${remainingCount} item${remainingCount === 1 ? '' : 's'} still unchecked. Complete trip anyway? Checked items go to pantry.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete trip', onPress: proceed },
        ],
      );
      return;
    }
    proceed();
  };

  const handleConfirmStoreAndTrip = (storeId: string | null) => {
    setTripStoreId(storeId);
    setStorePickerOpen(false);
    void runCompleteTrip(storeId);
  };

  const handleOpenRenameList = () => {
    setRenameValue(listName);
    setRenameOpen(true);
  };

  const handleSaveListName = async () => {
    if (!accessToken || !id) return;
    const next = renameValue.trim();
    if (!next) {
      Alert.alert('Enter a name');
      return;
    }
    setRenamingBusy(true);
    const result = await apiFetch<{ list: { name: string } }>(`/lists/${id}`, {
      method: 'PUT',
      token: accessToken,
      body: JSON.stringify({ name: next }),
    });
    setRenamingBusy(false);
    if (!result.success) {
      Alert.alert('Could not rename', result.error.message);
      return;
    }
    setListName(result.data.list.name);
    setRenameOpen(false);
    showToast('List renamed');
  };

  const handleDeleteList = () => {
    if (!accessToken || !id) return;
    Alert.alert('Delete list', `Delete "${listName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result = await apiFetch(`/lists/${id}`, {
              method: 'DELETE',
              token: accessToken,
            });
            if (!result.success) {
              Alert.alert('Could not delete', result.error.message);
              return;
            }
            router.replace('/(app)/lists');
          })();
        },
      },
    ]);
  };

  const handleShareList = async () => {
    const lines = items.map((item) => {
      const qty = item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity);
      const mark = item.checked ? '[x]' : '[ ]';
      const note = item.notes ? ` -- ${item.notes}` : '';
      return `${mark} ${item.name} (${qty})${note}`;
    });
    const message = [`${listName}`, ...lines].join('\n');
    try {
      await Share.share({ message, title: listName });
    } catch {
      Alert.alert('Could not share list');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!accessToken || !id) return;
    const result = await apiFetch<{ list: { id: string; name: string } }>(`/lists/${id}/copy`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        name: `${listName} template`,
        type: 'template',
      }),
    });
    if (!result.success) {
      Alert.alert('Could not save template', result.error.message);
      return;
    }
    showToast(`Saved template “${result.data.list.name}”`);
  };

  const handleOverflowMenu = () => {
    Alert.alert(listName, undefined, [
      { text: 'Rename', onPress: handleOpenRenameList },
      { text: 'Share list', onPress: () => void handleShareList() },
      ...(listType !== 'template'
        ? [{ text: 'Save as template', onPress: () => void handleSaveAsTemplate() }]
        : []),
      { text: 'Delete list', style: 'destructive' as const, onPress: handleDeleteList },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const selectedStoreName = stores.find((s) => s.id === tripStoreId)?.name;

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      {!online ? (
        <View className="bg-citrus px-4 py-2">
          <Text className="font-ui-medium text-ink">
            Offline — using cached list · changes sync later
          </Text>
        </View>
      ) : null}

      <View className="gap-2 border-b border-border px-4 pb-3 pt-4 dark:border-border-dark">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-1 font-display text-2xl text-ink dark:text-ink-on-dark"
            accessibilityRole="header"
          >
            {listName}
          </Text>
          <SyncPulse active={syncing} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="List options"
            onPress={handleOverflowMenu}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Text className="font-ui-bold text-2xl text-ink dark:text-ink-on-dark">⋯</Text>
          </Pressable>
        </View>
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
          Sort: {sortMode}
          {selectedStoreName ? ` · Trip store: ${selectedStoreName}` : ''}
          {estimate ? ` · Est. $${estimate.estimatedTotal.toFixed(2)}` : ''}
        </Text>
        {estimate ? (
          <Text className="font-ui text-xs text-ink-muted dark:text-ink-muted-dark">
            {estimate.pricedCount} priced · {estimate.unknownCount} unknown · {estimate.note}
          </Text>
        ) : null}
        <TextField
          label="Search items"
          value={filterQuery}
          onChangeText={setFilterQuery}
          placeholder="Filter by name, aisle, notes…"
          accessibilityLabel="Filter list items"
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: myItemsOnly }}
          accessibilityLabel="Show only my assigned items"
          onPress={() => setMyItemsOnly((v) => !v)}
          className="flex-row items-center gap-2 py-1"
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${
              myItemsOnly ? 'border-citrus bg-citrus' : 'border-border dark:border-border-dark'
            }`}
          >
            {myItemsOnly ? (
              <Text className="font-ui-bold text-xs text-ink">✓</Text>
            ) : null}
          </View>
          <Text className="font-ui text-ink dark:text-ink-on-dark">My items</Text>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        className="flex-1"
        keyExtractor={(row, index) =>
          row.kind === 'header' ? `h-${row.title}-${index}` : row.item.id
        }
        ListEmptyComponent={
          <EmptyState
            title={filterQuery.trim() ? 'No matching items' : 'List is empty'}
            description={
              filterQuery.trim()
                ? 'Try a different search, or clear the filter.'
                : 'Type an item below — typeahead pulls from memory, pantry, and catalog.'
            }
            actionLabel={filterQuery.trim() ? 'Clear filter' : 'Add an item'}
            onAction={() => {
              if (filterQuery.trim()) setFilterQuery('');
              else addFieldRef.current?.focus();
            }}
          />
        }
        renderItem={({ item: row }) => {
          if (row.kind === 'header') {
            return (
              <Text className="bg-sage-deep/40 px-4 py-2 font-ui-bold text-sm text-ink-muted dark:bg-surface-dark-elevated dark:text-ink-muted-dark">
                {row.title}
              </Text>
            );
          }
          const item = row.item;
          const qtyLabel = item.unit ? `${item.quantity} ${item.unit}` : `Qty ${item.quantity}`;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, long press to edit`}
              onLongPress={() => openEdit(item)}
              className="flex-row items-center border-b border-border px-2 dark:border-border-dark"
            >
              {reduceMotion ? (
                <CheckAffordance
                  checked={item.checked}
                  onToggle={() => handleToggle(item)}
                  label={item.name}
                />
              ) : (
                <MotiView
                  animate={{ scale: item.checked ? 1.12 : 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 280 }}
                >
                  <CheckAffordance
                    checked={item.checked}
                    onToggle={() => handleToggle(item)}
                    label={item.name}
                  />
                </MotiView>
              )}
              <View className="flex-1 py-3">
                <Text
                  className={`font-ui-medium text-base ${
                    item.checked
                      ? 'text-ink-muted line-through dark:text-ink-muted-dark'
                      : 'text-ink dark:text-ink-on-dark'
                  }`}
                >
                  {item.name}
                </Text>
                <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
                  {qtyLabel}
                  {item.category ? ` · ${item.category}` : ''}
                  {item.notes ? ` · ${item.notes}` : ''}
                  {item.assigneeUserId
                    ? ` · ${members.find((m) => m.id === item.assigneeUserId)?.name || 'Assigned'}`
                    : ''}
                </Text>
              </View>
              <Button label="Edit" variant="ghost" onPress={() => openEdit(item)} />
            </Pressable>
          );
        }}
      />

      <View className="gap-2 border-t border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark">
        {reduceMotion ? (
          <AddFlash flashKey={flashKey}>
            <TextField
              ref={addFieldRef}
              label="Add item"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => handleAdd()}
            />
          </AddFlash>
        ) : (
          <MotiView
            key={`add-${flashKey}`}
            from={{ scale: 0.96, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 260 }}
          >
            <AddFlash flashKey={flashKey}>
              <TextField
                ref={addFieldRef}
                label="Add item"
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={() => handleAdd()}
              />
            </AddFlash>
          </MotiView>
        )}

        {suggestions.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {suggestions.map((s) => (
              <Pressable
                key={`${s.source}-${s.name}`}
                accessibilityRole="button"
                accessibilityLabel={`Add ${s.name} from ${SOURCE_LABEL[s.source]}`}
                onPress={() =>
                  handleAdd({
                    name: s.name,
                    quantity: s.quantity || 1,
                    category: s.category,
                    aisleSection: s.aisleSection,
                    unit: s.unit,
                  })
                }
                className="rounded-xl border border-border bg-white px-3 py-2 dark:border-border-dark dark:bg-surface-dark-elevated"
              >
                <Text className="font-ui-medium text-sm text-ink dark:text-ink-on-dark">
                  {s.name}
                </Text>
                <Text className="font-ui text-xs text-ink-muted dark:text-ink-muted-dark">
                  {SOURCE_LABEL[s.source]}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View className="flex-row gap-2">
          <Button label="Add" onPress={() => handleAdd()} className="flex-1" />
          <Button
            label={
              completing
                ? 'Finishing…'
                : checkedCount < 1
                  ? 'Complete trip'
                  : `Complete (${checkedCount})`
            }
            variant="secondary"
            onPress={handleCompleteTrip}
            disabled={checkedCount < 1 || completing}
            className="flex-1"
            accessibilityLabel="Complete trip and add checked items to pantry"
          />
        </View>
      </View>

      <Sheet visible={Boolean(editItem)} title="Edit item" onClose={() => setEditItem(null)}>
        <TextField label="Name" value={editName} onChangeText={setEditName} />
        <View className="flex-row items-center gap-3">
          <Button
            label="−"
            variant="secondary"
            onPress={() => setEditQty((q) => Math.max(0.5, Math.round((q - 1) * 10) / 10))}
            className="min-w-[56px]"
          />
          <Text
            className="font-ui-bold text-lg text-ink dark:text-ink-on-dark"
            accessibilityLabel={`Quantity ${editQty}`}
          >
            {editQty}
          </Text>
          <Button
            label="+"
            variant="secondary"
            onPress={() => setEditQty((q) => Math.round((q + 1) * 10) / 10)}
            className="min-w-[56px]"
          />
        </View>
        <TextField
          label="Unit"
          value={editUnit}
          onChangeText={setEditUnit}
          placeholder="ea, lb, oz…"
        />
        <TextField
          label="Notes"
          value={editNotes}
          onChangeText={setEditNotes}
          placeholder="Brand, aisle tip…"
        />
        <Text className="font-ui-medium text-sm text-ink-muted dark:text-ink-muted-dark">Aisle</Text>
        <View className="flex-row flex-wrap gap-2">
          {AISLE_SECTIONS.map((section) => (
            <Pressable
              key={section}
              accessibilityRole="button"
              accessibilityState={{ selected: editAisle === section }}
              accessibilityLabel={`Aisle ${section}`}
              onPress={() => setEditAisle(section)}
              className={`rounded-xl px-3 py-2 ${
                editAisle === section
                  ? 'bg-citrus'
                  : 'bg-sage-deep/50 dark:bg-surface-dark-elevated'
              }`}
            >
              <Text className="font-ui text-sm text-ink dark:text-ink-on-dark">{section}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="font-ui-medium text-sm text-ink-muted dark:text-ink-muted-dark">
          Assign to
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !editAssignee }}
            accessibilityLabel="Unassigned"
            onPress={() => setEditAssignee('')}
            className={`rounded-xl px-3 py-2 ${
              !editAssignee ? 'bg-citrus' : 'bg-sage-deep/50 dark:bg-surface-dark-elevated'
            }`}
          >
            <Text className="font-ui text-sm text-ink dark:text-ink-on-dark">Unassigned</Text>
          </Pressable>
          {members.map((member) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityState={{ selected: editAssignee === member.id }}
              accessibilityLabel={`Assign to ${member.name}`}
              onPress={() => setEditAssignee(member.id)}
              className={`rounded-xl px-3 py-2 ${
                editAssignee === member.id
                  ? 'bg-citrus'
                  : 'bg-sage-deep/50 dark:bg-surface-dark-elevated'
              }`}
            >
              <Text className="font-ui text-sm text-ink dark:text-ink-on-dark">{member.name}</Text>
            </Pressable>
          ))}
        </View>
        <Button label="Save" onPress={handleSaveEdit} />
        <Button label="Delete item" variant="danger" onPress={handleDeleteEdit} />
      </Sheet>

      <Sheet visible={renameOpen} title="Rename list" onClose={() => setRenameOpen(false)}>
        <TextField
          label="List name"
          value={renameValue}
          onChangeText={setRenameValue}
          autoFocus
        />
        <Button
          label="Save name"
          onPress={handleSaveListName}
          loading={renamingBusy}
          accessibilityLabel="Save list name"
        />
      </Sheet>

      <Sheet
        visible={storePickerOpen}
        title="Optional store for this trip"
        onClose={() => setStorePickerOpen(false)}
      >
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
          Tag a store for price memory, or skip.
        </Text>
        {stores.map((store) => (
          <Button
            key={store.id}
            label={store.name}
            variant={tripStoreId === store.id ? 'primary' : 'secondary'}
            onPress={() => handleConfirmStoreAndTrip(store.id)}
          />
        ))}
        <Button
          label="Skip store & complete"
          variant="ghost"
          onPress={() => handleConfirmStoreAndTrip(null)}
        />
      </Sheet>

      <Sheet
        visible={Boolean(postTrip)}
        title="Trip complete"
        onClose={() => setPostTrip(null)}
      >
        <Text className="font-ui text-base text-ink dark:text-ink-on-dark">
          {postTrip
            ? `${postTrip.checkedCount} checked · ${postTrip.pantryCount} added to pantry.`
            : ''}
        </Text>
        <Button
          label="View pantry"
          onPress={() => {
            setPostTrip(null);
            router.push('/(app)/pantry');
          }}
        />
        <Button
          label="Keep shopping"
          variant="secondary"
          onPress={() => setPostTrip(null)}
        />
      </Sheet>

      <Toast
        message={toast}
        actionLabel={toastAction?.label}
        onAction={toastAction?.run}
      />
    </View>
  );
}
