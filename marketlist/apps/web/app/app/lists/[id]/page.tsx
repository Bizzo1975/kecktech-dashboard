'use client';

import { AISLE_SECTIONS, aisleSortIndex } from '@marketlist/shared';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { markFirstTrip, writeActivation } from '../../../../lib/activation';
import { apiFetch, getApiBase, readSession } from '../../../../lib/api';
import { writeCoach } from '../../../../lib/coach';

type SortMode = 'aisle' | 'category' | 'custom';

type Item = {
  id: string;
  name: string;
  aisleSection: string | null;
  category: string | null;
  checked: boolean;
  quantity: number;
  unit: string | null;
  notes: string | null;
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

export default function ListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [items, setItems] = useState<Item[]>([]);
  const [listName, setListName] = useState('List');
  const [nameDraft, setNameDraft] = useState('List');
  const [sortMode, setSortMode] = useState<SortMode>('aisle');
  const [listType, setListType] = useState<'shopping' | 'template'>('shopping');
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [toastCelebrate, setToastCelebrate] = useState(false);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('1');
  const [editUnit, setEditUnit] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAisle, setEditAisle] = useState<string>('Other');
  const [editAssignee, setEditAssignee] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [myItemsOnly, setMyItemsOnly] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [tripStoreId, setTripStoreId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{
    estimatedTotal: number;
    pricedCount: number;
    unknownCount: number;
    lines: Array<{
      name: string;
      quantity: number;
      unitPrice: number | null;
      lineTotal: number | null;
      source: string;
    }>;
    note?: string;
  } | null>(null);
  const [pantrySheet, setPantrySheet] = useState<{
    checkedCount: number;
    pantryCount: number;
  } | null>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, celebrate = false) => {
    setToast(message);
    setToastCelebrate(celebrate);
    setTimeout(() => {
      setToast(null);
      setToastCelebrate(false);
    }, celebrate ? 3500 : 2200);
  };

  const load = useCallback(async () => {
    const session = readSession();
    if (!session || !id) return;
    const result = await apiFetch<{
      list: {
        name: string;
        sortMode?: SortMode;
        type?: string;
        items: Item[];
        householdId: string;
      };
    }>(`/lists/${id}`, { token: session.accessToken });
    if (result.success) {
      setListName(result.data.list.name);
      setNameDraft(result.data.list.name);
      const mode = result.data.list.sortMode;
      setSortMode(mode === 'category' || mode === 'custom' ? mode : 'aisle');
      setListType(result.data.list.type === 'template' ? 'template' : 'shopping');
      setItems(result.data.list.items || []);
      setHouseholdId(result.data.list.householdId);
      const membersRes = await apiFetch<{ members: Member[] }>(
        `/households/${result.data.list.householdId}/members`,
        { token: session.accessToken },
      );
      if (membersRes.success) setMembers(membersRes.data.members);
      const estRes = await apiFetch<{
        estimatedTotal: number;
        pricedCount: number;
        unknownCount: number;
        lines: Array<{
          name: string;
          quantity: number;
          unitPrice: number | null;
          lineTotal: number | null;
          source: string;
        }>;
        note?: string;
      }>(`/lists/${id}/estimate`, { token: session.accessToken });
      if (estRes.success) setEstimate(estRes.data);
      const storeRes = await apiFetch<{ stores: Array<{ id: string; name: string }> }>(
        `/prices/stores?householdId=${result.data.list.householdId}`,
        { token: session.accessToken },
      );
      if (storeRes.success) setStores(storeRes.data.stores);
    }
  }, [id]);

  useEffect(() => {
    writeCoach({ openedList: true });
    writeActivation({ defaultListId: id });
    load();
    const session = readSession();
    if (!session?.householdId) return;
    const origin = getApiBase().startsWith('http')
      ? getApiBase().replace(/\/api$/, '')
      : window.location.origin;
    const socket = io(origin, { auth: { token: session.accessToken }, path: '/socket.io' });
    socket.emit('household:join', session.householdId);
    const refresh = () => load();
    socket.on('item:updated', refresh);
    socket.on('list:updated', refresh);
    return () => {
      socket.off('item:updated', refresh);
      socket.off('list:updated', refresh);
      socket.disconnect();
    };
  }, [load]);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      const session = readSession();
      const hh = householdId || session?.householdId;
      if (!session || !hh) return;
      const res = await apiFetch<{ suggestions: Suggestion[] }>(
        `/items/suggest?householdId=${hh}&q=${encodeURIComponent(q)}`,
        { token: session.accessToken },
      );
      if (res.success) setSuggestions(res.data.suggestions);
    },
    [householdId],
  );

  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!draft.trim()) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      fetchSuggestions(draft.trim());
    }, 200);
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [draft, fetchSuggestions]);

  const filtered = useMemo(() => {
    const session = readSession();
    const myId = session?.user?.id;
    const q = filterQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (myItemsOnly && myId && item.assigneeUserId !== myId) return false;
      if (!q) return true;
      const assigneeName =
        members.find((m) => m.id === item.assigneeUserId)?.name?.toLowerCase() || '';
      const hay = `${item.name} ${item.category || ''} ${item.aisleSection || ''} ${item.notes || ''} ${item.unit || ''} ${assigneeName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, filterQuery, myItemsOnly, members]);

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

  const checkedCount = items.filter((i) => i.checked).length;
  const remainingCount = items.filter((i) => !i.checked).length;

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session || !draft.trim()) return;
    const result = await apiFetch<{ item: Item; merged?: boolean }>(`/lists/${id}/items`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ name: draft.trim() }),
    });
    setDraft('');
    setSuggestions([]);
    writeCoach({ addedItem: true });
    if (result.success && result.data.merged) {
      showToast(`Merged quantity for ${result.data.item.name}`);
    } else {
      showToast('Added to list');
    }
    await load();
  };

  const handlePickSuggestion = async (suggestion: Suggestion) => {
    const session = readSession();
    if (!session) return;
    const result = await apiFetch<{ item: Item; merged?: boolean }>(`/lists/${id}/items`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        name: suggestion.name,
        quantity: suggestion.quantity || 1,
        unit: suggestion.unit,
        category: suggestion.category,
        aisleSection: suggestion.aisleSection,
      }),
    });
    setDraft('');
    setSuggestions([]);
    writeCoach({ addedItem: true });
    if (result.success && result.data.merged) {
      showToast(`Merged quantity for ${suggestion.name}`);
    } else {
      showToast(`Added ${suggestion.name}`);
    }
    await load();
  };

  const handleToggle = async (item: Item) => {
    const session = readSession();
    if (!session) return;
    const next = !item.checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)));
    if (next) {
      setUndoId(item.id);
      writeCoach({ checkedItem: true });
      showToast(`Checked off ${item.name}`);
    }
    await apiFetch(`/lists/${id}/items/${item.id}`, {
      method: 'PUT',
      token: session.accessToken,
      body: JSON.stringify({ checked: next }),
    });
  };

  const handleUndo = async () => {
    const session = readSession();
    if (!session || !undoId) return;
    await apiFetch(`/lists/${id}/items/${undoId}`, {
      method: 'PUT',
      token: session.accessToken,
      body: JSON.stringify({ checked: false }),
    });
    setUndoId(null);
    setToast(null);
    await load();
  };

  const handleOpenEdit = (item: Item) => {
    setEditing(item);
    setEditName(item.name);
    setEditQty(String(item.quantity || 1));
    setEditUnit(item.unit || '');
    setEditNotes(item.notes || '');
    setEditAisle(item.aisleSection || 'Other');
    setEditAssignee(item.assigneeUserId || '');
  };

  const handleCloseEdit = () => {
    setEditing(null);
  };

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session || !editing) return;
    const qty = Number(editQty);
    await apiFetch(`/lists/${id}/items/${editing.id}`, {
      method: 'PUT',
      token: session.accessToken,
      body: JSON.stringify({
        name: editName.trim(),
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unit: editUnit.trim() || null,
        notes: editNotes.trim() || null,
        aisleSection: editAisle,
        assigneeUserId: editAssignee || null,
      }),
    });
    setEditing(null);
    showToast('Item updated');
    await load();
  };

  const handleDeleteItem = async (item: Item) => {
    const session = readSession();
    if (!session) return;
    const ok = window.confirm(`Delete ${item.name}?`);
    if (!ok) return;
    await apiFetch(`/lists/${id}/items/${item.id}`, {
      method: 'DELETE',
      token: session.accessToken,
    });
    if (editing?.id === item.id) setEditing(null);
    showToast('Item deleted');
    await load();
  };

  const handleSaveListName = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    const next = nameDraft.trim();
    if (!session || !id || !next) return;
    setSavingName(true);
    const result = await apiFetch<{ list: { name: string; sortMode?: SortMode } }>(`/lists/${id}`, {
      method: 'PUT',
      token: session.accessToken,
      body: JSON.stringify({ name: next }),
    });
    setSavingName(false);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    setListName(result.data.list.name);
    setNameDraft(result.data.list.name);
    showToast('List renamed');
  };

  const handleShareList = async () => {
    const lines = items.map((item) => {
      const qty = item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity);
      const mark = item.checked ? '[x]' : '[ ]';
      const note = item.notes ? ` -- ${item.notes}` : '';
      return `${mark} ${item.name} (${qty})${note}`;
    });
    const text = [`${listName}`, ...lines].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('List copied to clipboard');
    } catch {
      showToast('Could not copy list');
    }
  };

  const handleDeleteList = async () => {
    const session = readSession();
    if (!session || !id) return;
    const ok = window.confirm(`Delete list "${listName}"? This cannot be undone.`);
    if (!ok) return;
    const result = await apiFetch(`/lists/${id}`, {
      method: 'DELETE',
      token: session.accessToken,
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    router.push('/app/lists');
  };

  const runCompleteTrip = async (storeId?: string | null) => {
    const session = readSession();
    if (!session || !id) return;
    const resolvedStoreId = storeId === undefined ? tripStoreId : storeId;
    setCompleting(true);
    const result = await apiFetch<{
      checkedCount: number;
      remainingCount: number;
      pantryUpserts: Array<{ name: string }>;
      pricesRecorded?: number;
    }>(`/lists/${id}/complete`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        addCheckedToPantry: true,
        storeId: resolvedStoreId || undefined,
        recordPricesFromMemory: true,
      }),
    });
    setCompleting(false);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    const pantryN = result.data.pantryUpserts.length;
    const pricesN = result.data.pricesRecorded ?? 0;
    markFirstTrip();
    writeCoach({
      completedTrip: true,
      ...(pantryN > 0 ? { addedPantry: true } : {}),
    });
    setPantrySheet({
      checkedCount: result.data.checkedCount,
      pantryCount: pantryN,
    });
    if (pricesN > 0) {
      showToast(`Recorded ${pricesN} price${pricesN === 1 ? '' : 's'} from memory`);
    }
    await load();
  };

  const handleCompleteTrip = async () => {
    if (remainingCount > 0) {
      const ok = window.confirm(
        `${remainingCount} item${remainingCount === 1 ? '' : 's'} still unchecked. Complete trip anyway? Checked items go to pantry.`,
      );
      if (!ok) return;
    }
    if (stores.length > 0) {
      setStorePickerOpen(true);
      return;
    }
    await runCompleteTrip(null);
  };

  const handleConfirmStoreAndTrip = (storeId: string | null) => {
    setTripStoreId(storeId);
    setStorePickerOpen(false);
    void runCompleteTrip(storeId);
  };

  const handleSaveAsTemplate = async () => {
    const session = readSession();
    if (!session || !id) return;
    const result = await apiFetch<{ list: { id: string; name: string } }>(`/lists/${id}/copy`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        name: `${listName} template`,
        type: 'template',
      }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    showToast(`Saved template “${result.data.list.name}”`);
  };

  const handleKeepShopping = () => {
    setPantrySheet(null);
  };

  const sectionLabel = (item: Item) => {
    if (sortMode === 'category') return item.category || 'Other';
    if (sortMode === 'custom') return 'Your order';
    return item.aisleSection || 'Other';
  };

  let lastSection = '';

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>{listName}</h1>
        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleShareList}
            aria-label="Copy list contents to clipboard"
          >
            Share
          </button>
          {listType !== 'template' ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handleSaveAsTemplate()}
              aria-label="Save this list as a reusable template"
            >
              Save as template
            </button>
          ) : (
            <span className="muted" style={{ alignSelf: 'center' }}>
              Template
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary trip-complete"
            onClick={handleCompleteTrip}
            disabled={completing || checkedCount === 0}
            aria-label="Complete trip and add checked items to pantry"
          >
            {completing ? 'Finishing...' : 'Complete trip'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleDeleteList}
            aria-label={`Delete list ${listName}`}
          >
            Delete list
          </button>
        </div>
      </div>

      <form className="card stack" onSubmit={handleSaveListName}>
        <div className="field">
          <label htmlFor="list-title">List name</label>
          <input
            id="list-title"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            aria-label="Edit list name"
          />
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Sort: {sortMode}
        </p>
        <button
          className="btn btn-secondary"
          type="submit"
          disabled={savingName || nameDraft.trim() === listName || !nameDraft.trim()}
          aria-label="Save list name"
        >
          {savingName ? 'Saving...' : 'Save name'}
        </button>
      </form>

      {estimate && estimate.lines.length > 0 ? (
        <div className="card stack" aria-label="Basket estimate">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <strong>Basket estimate</strong>
            <span className="muted">
              ${estimate.estimatedTotal.toFixed(2)} · {estimate.pricedCount} priced
              {estimate.unknownCount > 0 ? ` · ${estimate.unknownCount} unknown` : ''}
            </span>
          </div>
          {estimate.note ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {estimate.note}
            </p>
          ) : null}
          {estimate.lines.slice(0, 8).map((line) => (
            <div key={line.name} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                {line.name}
                {line.quantity > 1 ? ` ×${line.quantity}` : ''}
              </span>
              <span className="muted">
                {line.lineTotal != null ? `$${line.lineTotal.toFixed(2)}` : '—'}
              </span>
            </div>
          ))}
          {estimate.lines.length > 8 ? (
            <p className="muted" style={{ margin: 0 }}>
              +{estimate.lines.length - 8} more items
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="card stack" onSubmit={handleAdd}>
        <div className="field">
          <label htmlFor="item">Add item</label>
          <input
            id="item"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="item-suggestions"
          />
        </div>
        {items.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Type milk — suggestions appear from memory, pantry, and staples.
          </p>
        ) : null}
        {suggestions.length > 0 ? (
          <div id="item-suggestions" className="row" role="listbox" aria-label="Suggestions">
            {suggestions.map((s) => (
              <button
                key={`${s.source}-${s.name}`}
                type="button"
                className="suggest-chip"
                role="option"
                aria-label={`Add ${s.name} from ${s.source}`}
                onClick={() => handlePickSuggestion(s)}
              >
                {s.name}
                <span className="muted" style={{ fontSize: '0.75rem' }}>
                  {' '}
                  · {s.source}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="row">
          <button className="btn btn-primary" type="submit">
            Add to list
          </button>
          {undoId ? (
            <button className="btn btn-secondary" type="button" onClick={handleUndo}>
              Undo check-off
            </button>
          ) : null}
        </div>
      </form>

      <div className="field">
        <label htmlFor="item-filter">Search items</label>
        <input
          id="item-filter"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter by name, aisle, notes..."
          aria-label="Filter list items"
        />
      </div>
      <label className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={myItemsOnly}
          onChange={(e) => setMyItemsOnly(e.target.checked)}
          aria-label="Show only my assigned items"
        />
        <span>My items</span>
      </label>

      <div>
        {sorted.length === 0 ? (
          <div className="empty">
            <h2>{filterQuery.trim() ? 'No matching items' : 'List is empty'}</h2>
            <p>
              {filterQuery.trim()
                ? 'Try a different search, or clear the filter.'
                : 'Add items with typeahead from memory, pantry, or catalog.'}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                document.getElementById(filterQuery.trim() ? 'item-filter' : 'item')?.focus()
              }
            >
              {filterQuery.trim() ? 'Edit filter' : 'Add an item'}
            </button>
          </div>
        ) : null}
        {sorted.map((item) => {
          const section = sectionLabel(item);
          const showHeader =
            sortMode === 'custom'
              ? false
              : section !== lastSection && !item.checked;
          if (showHeader) lastSection = section;
          const qtyLabel = item.unit ? `${item.quantity} ${item.unit}` : `Qty ${item.quantity}`;
          return (
            <div key={item.id}>
              {showHeader ? <div className="aisle-head">{section}</div> : null}
              <div className="list-row">
                <button
                  type="button"
                  className={`check ${item.checked ? 'on' : ''}`}
                  aria-label={`Mark ${item.name} ${item.checked ? 'unchecked' : 'checked'}`}
                  aria-pressed={item.checked}
                  onClick={() => handleToggle(item)}
                >
                  {item.checked ? '\u2713' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <div className={item.checked ? 'strike' : ''}>
                    <strong>{item.name}</strong>
                  </div>
                  <div className="muted">
                    {qtyLabel}
                    {item.category ? ` · ${item.category}` : ''}
                    {item.notes ? ` · ${item.notes}` : ''}
                    {item.assigneeUserId
                      ? ` · ${members.find((m) => m.id === item.assigneeUserId)?.name || 'Assigned'}`
                      : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Edit ${item.name}`}
                  onClick={() => handleOpenEdit(item)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => handleDeleteItem(item)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing ? (
        <div className="modal-backdrop" role="presentation" onClick={handleCloseEdit}>
          <div
            className="modal card stack"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-item-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-item-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
              Edit item
            </h2>
            <form className="stack" onSubmit={handleSaveEdit}>
              <div className="field">
                <label htmlFor="edit-name">Name</label>
                <input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="edit-qty">Quantity</label>
                <input
                  id="edit-qty"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="edit-unit">Unit</label>
                <input
                  id="edit-unit"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  placeholder="e.g. lb, each, bag"
                />
              </div>
              <div className="field">
                <label htmlFor="edit-notes">Notes</label>
                <input
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Brand, size, aisle hint"
                />
              </div>
              <div className="field">
                <label htmlFor="edit-aisle">Aisle</label>
                <select
                  id="edit-aisle"
                  value={editAisle}
                  onChange={(e) => setEditAisle(e.target.value)}
                >
                  {AISLE_SECTIONS.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="edit-assignee">Assign to</label>
                <select
                  id="edit-assignee"
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  aria-label="Assign item to household member"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row">
                <button className="btn btn-primary" type="submit">
                  Save
                </button>
                <button className="btn btn-ghost" type="button" onClick={handleCloseEdit}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => handleDeleteItem(editing)}
                >
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {storePickerOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setStorePickerOpen(false)}
        >
          <div
            className="modal card stack"
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-picker-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="store-picker-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
              Store for this trip
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              Tag a store to record prices from memory when you complete the trip.
            </p>
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                className={tripStoreId === store.id ? 'btn btn-primary' : 'btn btn-secondary'}
                aria-label={`Complete trip at ${store.name}`}
                onClick={() => handleConfirmStoreAndTrip(store.id)}
              >
                {store.name}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              aria-label="Skip store and complete trip"
              onClick={() => handleConfirmStoreAndTrip(null)}
            >
              Skip store &amp; complete
            </button>
          </div>
        </div>
      ) : null}

      {pantrySheet ? (
        <div className="modal-backdrop" role="presentation" onClick={handleKeepShopping}>
          <div
            className="modal card stack"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pantry-sheet-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pantry-sheet-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
              Trip complete
            </h2>
            <p style={{ margin: 0 }}>
              {pantrySheet.checkedCount} checked item
              {pantrySheet.checkedCount === 1 ? '' : 's'} finished.
              {pantrySheet.pantryCount > 0
                ? ` ${pantrySheet.pantryCount} pantry update${pantrySheet.pantryCount === 1 ? '' : 's'}.`
                : ' Pantry was already up to date.'}
            </p>
            <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <Link
                className="btn btn-primary"
                href="/app/pantry"
                aria-label="View pantry after trip"
                onClick={() => setPantrySheet(null)}
              >
                View pantry
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleKeepShopping}
                aria-label="Keep shopping on this list"
              >
                Keep shopping
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`toast${toastCelebrate ? ' toast-celebrate' : ''}`} role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
