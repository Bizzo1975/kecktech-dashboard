'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, readSession } from '../../../lib/api';
import { writeCoach } from '../../../lib/coach';

type Pantry = {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string | null;
  lowStockThreshold: number | null;
  unit: string | null;
};

type Urgency = 'expired' | 'soon' | 'low' | 'ok';

const urgencyFor = (item: Pantry): Urgency => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (item.expiryDate) {
    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (expiry < today) return 'expired';
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 5);
    if (expiry <= soon) return 'soon';
  }
  const threshold = item.lowStockThreshold;
  if (threshold !== null && threshold !== undefined && Number(item.quantity) <= Number(threshold)) {
    return 'low';
  }
  return 'ok';
};

const URGENCY_ORDER: Urgency[] = ['expired', 'soon', 'low', 'ok'];
const URGENCY_LABEL: Record<Urgency, string> = {
  expired: 'Expired',
  soon: 'Expiring soon',
  low: 'Low stock',
  ok: 'Good',
};

export default function PantryPage() {
  const [items, setItems] = useState<Pantry[]>([]);
  const [name, setName] = useState('');
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Pantry | null>(null);
  const [editQty, setEditQty] = useState('1');
  const [editExpiry, setEditExpiry] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [loading, setLoading] = useState(true);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    const session = readSession();
    if (!session?.householdId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const pantry = await apiFetch<{ items: Pantry[] }>(`/pantry?householdId=${session.householdId}`, {
      token: session.accessToken,
    });
    if (pantry.success) setItems(pantry.data.items);
    const listRes = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
      `/lists?householdId=${session.householdId}`,
      { token: session.accessToken },
    );
    if (listRes.success) {
      setLists(listRes.data.lists);
      setSelectedListId((prev) => prev || listRes.data.lists[0]?.id || '');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    writeCoach({ visitedPantry: true });
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const buckets: Record<Urgency, Pantry[]> = { expired: [], soon: [], low: [], ok: [] };
    for (const item of items) {
      buckets[urgencyFor(item)].push(item);
    }
    return buckets;
  }, [items]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session?.householdId || !name.trim()) return;
    const result = await apiFetch('/pantry', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ householdId: session.householdId, name: name.trim(), quantity: 1 }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    writeCoach({ addedPantry: true });
    setName('');
    await load();
  };

  const handleAddToList = async (pantryId: string) => {
    const session = readSession();
    if (!session) return;
    if (!selectedListId) {
      showToast('Select a list first');
      return;
    }
    const listName = lists.find((l) => l.id === selectedListId)?.name || 'list';
    await apiFetch(`/pantry/${pantryId}/add-to-list`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ listId: selectedListId }),
    });
    showToast(`Added to ${listName}`);
  };

  const handleOpenEdit = (item: Pantry) => {
    setEditing(item);
    setEditQty(String(item.quantity || 1));
    setEditExpiry(item.expiryDate || '');
    setEditThreshold(
      item.lowStockThreshold !== null && item.lowStockThreshold !== undefined
        ? String(item.lowStockThreshold)
        : '',
    );
  };

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session || !editing) return;
    const qty = Number(editQty);
    const thresholdRaw = editThreshold.trim();
    const threshold =
      thresholdRaw === ''
        ? null
        : Number.isFinite(Number(thresholdRaw))
          ? Number(thresholdRaw)
          : null;
    const result = await apiFetch(`/pantry/${editing.id}`, {
      method: 'PUT',
      token: session.accessToken,
      body: JSON.stringify({
        quantity: Number.isFinite(qty) && qty >= 0 ? qty : 1,
        expiryDate: editExpiry || null,
        lowStockThreshold: threshold,
      }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    writeCoach({ addedPantry: true });
    setEditing(null);
    showToast('Pantry item updated');
    await load();
  };

  const handleDelete = async (item: Pantry) => {
    const session = readSession();
    if (!session) return;
    const ok = window.confirm(`Remove ${item.name} from pantry?`);
    if (!ok) return;
    await apiFetch(`/pantry/${item.id}`, {
      method: 'DELETE',
      token: session.accessToken,
    });
    if (editing?.id === item.id) setEditing(null);
    showToast('Removed from pantry');
    await load();
  };

  return (
    <div className="stack">
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Pantry</h1>

      <div className="card stack">
        <div className="field">
          <label htmlFor="target-list">Add to list target</label>
          <select
            id="target-list"
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            aria-label="Select shopping list for pantry adds"
          >
            <option value="">Select a list…</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
        <form className="stack" onSubmit={handleAdd}>
          <div className="field">
            <label htmlFor="pantry">Pantry item</label>
            <input id="pantry" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">
            Add to pantry
          </button>
        </form>
      </div>

      {loading ? <div className="skeleton" /> : null}

      {!loading && items.length === 0 ? (
        <div className="empty">
          <h2>Pantry is empty</h2>
          <p>Add staples you keep at home so recipes can match what you already have.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('pantry')?.focus()}
          >
            Add a pantry item
          </button>
        </div>
      ) : null}

      {!loading
        ? URGENCY_ORDER.map((urgency) => {
            const group = grouped[urgency];
            if (group.length === 0) return null;
            return (
              <section key={urgency} className="stack" aria-label={URGENCY_LABEL[urgency]}>
                <h2 style={{ margin: 0, fontSize: '1rem' }}>{URGENCY_LABEL[urgency]}</h2>
                {group.map((item) => (
                  <div key={item.id} className={`list-row urgency-${urgency}`}>
                    <div style={{ flex: 1 }}>
                      <strong>{item.name}</strong>
                      <div className="muted">
                        Qty {item.quantity}
                        {item.unit ? ` ${item.unit}` : ''}
                        {item.expiryDate ? ` · exp ${item.expiryDate}` : ''}
                        {item.lowStockThreshold !== null && item.lowStockThreshold !== undefined
                          ? ` · low at ${item.lowStockThreshold}`
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
                      aria-label={`Add ${item.name} to list`}
                      onClick={() => handleAddToList(item.id)}
                    >
                      To list
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </section>
            );
          })
        : null}

      {editing ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <div
            className="modal card stack"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-pantry-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-pantry-title" style={{ margin: 0, fontFamily: 'var(--font-display)' }}>
              Edit {editing.name}
            </h2>
            <form className="stack" onSubmit={handleSaveEdit}>
              <div className="field">
                <label htmlFor="edit-pantry-qty">Quantity</label>
                <input
                  id="edit-pantry-qty"
                  type="number"
                  min="0"
                  step="0.1"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="edit-pantry-expiry">Expiry</label>
                <input
                  id="edit-pantry-expiry"
                  type="date"
                  value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="edit-pantry-threshold">Low-stock threshold</label>
                <input
                  id="edit-pantry-threshold"
                  type="number"
                  min="0"
                  step="0.1"
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(e.target.value)}
                  placeholder="Leave blank for none"
                  aria-label="Low stock threshold"
                />
              </div>
              <div className="row">
                <button className="btn btn-primary" type="submit">
                  Save
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
