'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, readSession } from '../../../lib/api';

type List = { id: string; name: string; sortMode: string; type?: string };

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSortMode, setRenameSortMode] = useState<'aisle' | 'category' | 'custom'>('aisle');
  const [fromTemplateBusy, setFromTemplateBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = readSession();
    if (!session?.householdId) return;
    const result = await apiFetch<{ lists: List[] }>(`/lists?householdId=${session.householdId}`, {
      token: session.accessToken,
    });
    if (result.success) setLists(result.data.lists);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session?.householdId || !name.trim()) return;
    setCreating(true);
    const result = await apiFetch<{ list: List }>('/lists', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ householdId: session.householdId, name: name.trim(), sortMode: 'aisle' }),
    });
    setCreating(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setName('');
    setError(null);
    router.push(`/app/lists/${result.data.list.id}`);
  };

  const handleStartRename = (list: List) => {
    setRenamingId(list.id);
    setRenameValue(list.name);
    setRenameSortMode(
      list.sortMode === 'category' || list.sortMode === 'custom' ? list.sortMode : 'aisle',
    );
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
    setRenameSortMode('aisle');
  };

  const handleSaveRename = async (listId: string) => {
    const session = readSession();
    const next = renameValue.trim();
    if (!session || !next) return;
    const result = await apiFetch<{ list: List }>(`/lists/${listId}`, {
      method: 'PUT',
      token: session.accessToken,
      body: JSON.stringify({ name: next, sortMode: renameSortMode }),
    });
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setRenamingId(null);
    setRenameValue('');
    setError(null);
    await load();
  };

  const handleDelete = async (list: List) => {
    const session = readSession();
    if (!session) return;
    const ok = window.confirm(`Delete list "${list.name}"? This cannot be undone.`);
    if (!ok) return;
    const result = await apiFetch(`/lists/${list.id}`, {
      method: 'DELETE',
      token: session.accessToken,
    });
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    if (renamingId === list.id) handleCancelRename();
    await load();
  };

  const handleNewFromTemplate = async (template: List) => {
    const session = readSession();
    if (!session) return;
    setFromTemplateBusy(template.id);
    const result = await apiFetch<{ list: List }>(`/lists/${template.id}/copy`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        name: `${template.name.replace(/\s*template$/i, '').trim() || template.name} run`,
        type: 'shopping',
      }),
    });
    setFromTemplateBusy(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError(null);
    router.push(`/app/lists/${result.data.list.id}`);
  };

  const shoppingLists = lists.filter((l) => (l.type || 'shopping') !== 'template');
  const templates = lists.filter((l) => l.type === 'template');

  const session = typeof window !== 'undefined' ? readSession() : null;
  if (!session?.householdId) {
    return (
      <div className="empty card">
        <h2>Join a household</h2>
        <p>Create or join a household in Settings to start shared lists.</p>
        <Link className="btn btn-primary" href="/app/settings">
          Open settings
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Lists</h1>
      <form className="card stack" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="list-name">New list name</label>
          <input id="list-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={creating || !name.trim()}>
          {creating ? 'Creating...' : 'Create list'}
        </button>
      </form>
      {templates.length > 0 ? (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>New from template</h2>
          <p className="muted" style={{ margin: 0 }}>
            Copy a saved template into a fresh shopping list (items unchecked).
          </p>
          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="btn btn-secondary"
                disabled={fromTemplateBusy === template.id}
                aria-label={`Create shopping list from template ${template.name}`}
                onClick={() => void handleNewFromTemplate(template)}
              >
                {fromTemplateBusy === template.id ? 'Creating…' : template.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {shoppingLists.length === 0 && templates.length === 0 ? (
        <div className="empty">
          <h2>No lists</h2>
          <p>Create your first shopping list above, then open it to shop.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('list-name')?.focus()}
          >
            Name a list
          </button>
        </div>
      ) : (
        shoppingLists.map((list) => (
          <div key={list.id} className="list-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              {renamingId === list.id ? (
                <div className="stack" style={{ flex: 1, gap: '0.5rem' }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label htmlFor={`rename-${list.id}`}>Rename list</label>
                    <input
                      id={`rename-${list.id}`}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSaveRename(list.id);
                        }
                        if (e.key === 'Escape') handleCancelRename();
                      }}
                      aria-label={`Rename ${list.name}`}
                      autoFocus
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label htmlFor={`sort-${list.id}`}>Sort mode</label>
                    <select
                      id={`sort-${list.id}`}
                      value={renameSortMode}
                      onChange={(e) =>
                        setRenameSortMode(e.target.value as 'aisle' | 'category' | 'custom')
                      }
                      aria-label={`Sort mode for ${list.name}`}
                    >
                      <option value="aisle">Aisle</option>
                      <option value="category">Category</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <strong>{list.name}</strong>
                  <div className="muted">Sort: {list.sortMode}</div>
                </>
              )}
            </div>
            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              {renamingId === list.id ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    aria-label={`Save new name for ${list.name}`}
                    onClick={() => handleSaveRename(list.id)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    aria-label="Cancel rename"
                    onClick={handleCancelRename}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/app/lists/${list.id}`}
                    className="btn btn-primary"
                    aria-label={`Open list ${list.name}`}
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label={`Rename list ${list.name}`}
                    onClick={() => handleStartRename(list)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    aria-label={`Delete list ${list.name}`}
                    onClick={() => handleDelete(list)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
