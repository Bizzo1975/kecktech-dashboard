'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch, readSession } from '../../../lib/api';
import { writeCoach } from '../../../lib/coach';

type Store = { id: string; name: string };
type Deal = { itemName: string; lowestPrice: number; averagePrice: number };
type HistoryEntry = {
  id: string;
  price: number;
  recordedAt: string;
  Store?: { id: string; name: string } | null;
};

export default function PricesPage() {
  const [storeName, setStoreName] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyItem, setHistoryItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    const session = readSession();
    if (!session) return;
    setLoading(true);
    setError(null);
    const s = await apiFetch<{ stores: Store[] }>(
      `/prices/stores${session.householdId ? `?householdId=${session.householdId}` : ''}`,
      { token: session.accessToken },
    );
    if (s.success) {
      setStores(s.data.stores);
      setStoreId((prev) => prev || s.data.stores[0]?.id || '');
    } else {
      setError(s.error.message);
    }
    const d = await apiFetch<{ deals: Deal[] }>(
      `/prices/deals${session.householdId ? `?householdId=${session.householdId}` : ''}`,
      { token: session.accessToken },
    );
    if (d.success) setDeals(d.data.deals);
    else if (!s.success) setError(d.error.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStore = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session || !storeName.trim()) return;
    const result = await apiFetch<{ store: Store }>('/prices/stores', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ name: storeName.trim(), householdId: session.householdId }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    writeCoach({ recordedPrice: true });
    setStoreName('');
    setStoreId(result.data.store.id);
    await load();
    showToast('Store added');
  };

  const handlePrice = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session || !storeId || !itemName.trim() || !price) {
      showToast('Pick a store, item, and price');
      return;
    }
    const result = await apiFetch(
      `/prices/items/${encodeURIComponent(itemName.trim())}/stores/${storeId}`,
      {
        method: 'PUT',
        token: session.accessToken,
        body: JSON.stringify({
          price: Number(price),
          householdId: session.householdId,
          category: category.trim() || null,
        }),
      },
    );
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    writeCoach({ recordedPrice: true });
    const recordedName = itemName.trim();
    setItemName('');
    setPrice('');
    setCategory('');
    await load();
    await loadHistory(recordedName);
    showToast('Price recorded');
  };

  const loadHistory = async (name: string) => {
    const session = readSession();
    const trimmed = name.trim();
    if (!session || !trimmed) {
      setHistory([]);
      setHistoryItem('');
      return;
    }
    setHistoryLoading(true);
    setHistoryItem(trimmed);
    const result = await apiFetch<{ history: HistoryEntry[] }>(
      `/prices/items/${encodeURIComponent(trimmed)}/history${
        session.householdId ? `?householdId=${session.householdId}` : ''
      }`,
      { token: session.accessToken },
    );
    setHistoryLoading(false);
    if (!result.success) {
      setHistory([]);
      showToast(result.error.message);
      return;
    }
    setHistory(result.data.history);
  };

  const handleLookupHistory = (event: FormEvent) => {
    event.preventDefault();
    void loadHistory(itemName);
  };

  return (
    <div className="stack">
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Price memory</h1>
      <p className="muted">Your household prices only — no fake scrapers.</p>

      {error ? (
        <div className="empty card" role="alert">
          <h2>Could not load prices</h2>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => load()}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? <div className="skeleton" aria-label="Loading prices" /> : null}

      <form className="card stack" onSubmit={handleStore}>
        <div className="field">
          <label htmlFor="store">Store name</label>
          <input id="store" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">
          Add store
        </button>
      </form>

      <form className="card stack" onSubmit={handlePrice}>
        <div className="field">
          <label htmlFor="store-pick">Store</label>
          <select
            id="store-pick"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            aria-label="Select store for this price"
          >
            <option value="">Select a store…</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        {!loading && stores.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Add a store above before recording a price.
          </p>
        ) : null}
        <div className="field">
          <label htmlFor="item">Item</label>
          <input id="item" value={itemName} onChange={(e) => setItemName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="price-category">Category</label>
          <input
            id="price-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Dairy, Produce"
            aria-label="Category for this price"
          />
        </div>
        <div className="field">
          <label htmlFor="price">Price</label>
          <input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="row">
          <button className="btn btn-secondary" type="submit" disabled={!storeId}>
            Record price
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={handleLookupHistory}
            disabled={!itemName.trim()}
            aria-label="Show price history for this item"
          >
            Show history
          </button>
        </div>
      </form>

      {historyLoading ? <div className="skeleton" aria-label="Loading history" /> : null}

      {!historyLoading && historyItem ? (
        <section className="card stack" aria-label="Price history">
          <strong>History · {historyItem}</strong>
          {history.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No recorded prices for this item yet.
            </p>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="list-row">
                <div style={{ flex: 1 }}>
                  <strong>${Number(entry.price).toFixed(2)}</strong>
                  <div className="muted">
                    {entry.Store?.name || 'Unknown store'} ·{' '}
                    {new Date(entry.recordedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      ) : null}

      {!loading && !error && deals.length === 0 ? (
        <div className="empty card">
          <h2>No deals yet</h2>
          <p>Record a few prices at different stores to see honest savings.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('item')?.focus()}
          >
            Record a price
          </button>
        </div>
      ) : null}

      {!loading && deals.length > 0
        ? deals.map((deal) => (
            <button
              key={deal.itemName}
              type="button"
              className="list-row"
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => {
                setItemName(deal.itemName);
                void loadHistory(deal.itemName);
              }}
              aria-label={`Show history for ${deal.itemName}`}
            >
              {deal.itemName}: low ${Number(deal.lowestPrice).toFixed(2)} (avg $
              {Number(deal.averagePrice).toFixed(2)})
            </button>
          ))
        : null}

      <p className="muted">
        Looking for trends?{' '}
        <Link href="/app/insights" className="btn btn-ghost" style={{ display: 'inline' }}>
          Open Insights
        </Link>
      </p>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
