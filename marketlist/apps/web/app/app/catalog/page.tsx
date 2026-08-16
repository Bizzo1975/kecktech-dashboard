'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch, readSession } from '../../../lib/api';
import { writeCoach } from '../../../lib/coach';

type CatalogItem = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
};

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async (q = '') => {
    const session = readSession();
    if (!session) return;
    setLoading(true);
    const query = q.trim();
    const path = query
      ? `/catalog/items?search=${encodeURIComponent(query)}&limit=100`
      : '/catalog/items?limit=100';
    const result = await apiFetch<{ items: CatalogItem[] }>(path, { token: session.accessToken });
    setLoading(false);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    setItems(result.data.items);
  }, []);

  useEffect(() => {
    void load('');
  }, [load]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    void load(search);
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session || !name.trim()) return;
    const result = await apiFetch<{ item: CatalogItem }>('/catalog/items', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        name: name.trim(),
        category: category.trim() || undefined,
      }),
    });
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    setName('');
    setCategory('');
    writeCoach({ usedCatalog: true });
    showToast('Catalog item added');
    await load(search);
  };

  return (
    <div className="stack">
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Catalog</h1>
      <p className="muted">
        Shared item names and categories that power list typeahead. Add staples here so suggestions
        show up while shopping.
      </p>

      <form className="card row" onSubmit={handleSearch} style={{ alignItems: 'flex-end', gap: '0.75rem' }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="catalog-search">Search</label>
          <input
            id="catalog-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Milk, oats…"
            aria-label="Search catalog items"
          />
        </div>
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
      </form>

      <form className="card stack" onSubmit={handleAdd}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Add catalog item</h2>
        <div className="field">
          <label htmlFor="catalog-name">Name</label>
          <input
            id="catalog-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-label="Catalog item name"
          />
        </div>
        <div className="field">
          <label htmlFor="catalog-category">Category</label>
          <input
            id="catalog-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Dairy, Produce…"
            aria-label="Catalog item category"
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Add to catalog
        </button>
      </form>

      {loading ? <div className="skeleton" aria-label="Loading catalog" /> : null}

      {!loading && items.length === 0 ? (
        <div className="empty card">
          <h2>No catalog items</h2>
          <p>Add a name and category above. Typeahead on lists pulls from this catalog.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('catalog-name')?.focus()}
          >
            Add an item
          </button>
        </div>
      ) : null}

      {!loading
        ? items.map((item) => (
            <div key={item.id} className="list-row">
              <div style={{ flex: 1 }}>
                <strong>{item.name}</strong>
                {item.category ? <div className="muted">{item.category}</div> : null}
              </div>
            </div>
          ))
        : null}

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
