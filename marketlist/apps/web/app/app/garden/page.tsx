'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, readSession } from '../../../lib/api';

type GardenSource = {
  id: string;
  householdId: string;
  type: 'manual' | 'farmbot' | 'indoor_tray';
  name: string;
  farmbotDeviceId: string | null;
  lastSyncedAt: string | null;
  hasFarmbotToken: boolean;
};

type GardenYield = {
  id: string;
  gardenSourceId: string;
  plantName: string;
  expectedHarvestStart: string | null;
  expectedHarvestEnd: string | null;
  estimatedYieldQty: number | null;
  estimatedYieldUnit: string | null;
  status: 'planted' | 'growing' | 'ready' | 'harvested';
  farmbotPlantId: string | null;
  harvestedPantryItemId: string | null;
};

const SOURCE_LABEL: Record<GardenSource['type'], string> = {
  manual: 'Outdoor bed',
  indoor_tray: 'Indoor tray',
  farmbot: 'FarmBot',
};

const STATUS_OPTIONS: GardenYield['status'][] = ['planted', 'growing', 'ready', 'harvested'];

export default function GardenPage() {
  const [sources, setSources] = useState<GardenSource[]>([]);
  const [yields, setYields] = useState<GardenYield[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState<GardenSource['type']>('manual');
  const [farmbotToken, setFarmbotToken] = useState('');
  const [farmbotDeviceId, setFarmbotDeviceId] = useState('');
  const [savingSource, setSavingSource] = useState(false);

  const [plantName, setPlantName] = useState('');
  const [plantSourceId, setPlantSourceId] = useState('');
  const [plantStatus, setPlantStatus] = useState<GardenYield['status']>('planted');
  const [harvestStart, setHarvestStart] = useState('');
  const [harvestEnd, setHarvestEnd] = useState('');
  const [yieldQty, setYieldQty] = useState('');
  const [yieldUnit, setYieldUnit] = useState('');
  const [savingYield, setSavingYield] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [harvestingId, setHarvestingId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2800);
  };

  const load = useCallback(async () => {
    const session = readSession();
    if (!session?.householdId) {
      setLoading(false);
      setError('Join or create a household to track gardens.');
      return;
    }
    setLoading(true);
    setError(null);
    const [srcRes, yieldRes] = await Promise.all([
      apiFetch<{ sources: GardenSource[] }>(
        `/garden-sources?householdId=${session.householdId}`,
        { token: session.accessToken },
      ),
      apiFetch<{ yields: GardenYield[] }>(
        `/garden-yields?householdId=${session.householdId}`,
        { token: session.accessToken },
      ),
    ]);
    if (srcRes.success) {
      setSources(srcRes.data.sources);
      setPlantSourceId((prev) => prev || srcRes.data.sources[0]?.id || '');
    } else {
      setError(srcRes.error?.message || 'Could not load garden sources');
    }
    if (yieldRes.success) setYields(yieldRes.data.yields);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const yieldsBySource = useMemo(() => {
    const map = new Map<string, GardenYield[]>();
    for (const y of yields) {
      const list = map.get(y.gardenSourceId) || [];
      list.push(y);
      map.set(y.gardenSourceId, list);
    }
    return map;
  }, [yields]);

  const handleCreateSource = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session?.householdId || !sourceName.trim()) return;
    setSavingSource(true);
    setError(null);
    const body: Record<string, unknown> = {
      householdId: session.householdId,
      type: sourceType,
      name: sourceName.trim(),
    };
    if (sourceType === 'farmbot') {
      if (farmbotDeviceId.trim()) body.farmbotDeviceId = farmbotDeviceId.trim();
      if (farmbotToken.trim()) body.farmbotApiToken = farmbotToken.trim();
    }
    const res = await apiFetch<{ source: GardenSource }>('/garden-sources', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify(body),
    });
    setSavingSource(false);
    if (!res.success) {
      setError(res.error?.message || 'Could not create garden source');
      return;
    }
    setSourceName('');
    setFarmbotToken('');
    setFarmbotDeviceId('');
    showToast('Garden source added');
    await load();
  };

  const handleSync = async (sourceId: string) => {
    const session = readSession();
    if (!session) return;
    setSyncingId(sourceId);
    setError(null);
    const res = await apiFetch<{ synced: number }>(`/garden-sources/${sourceId}/sync`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({}),
    });
    setSyncingId(null);
    if (!res.success) {
      setError(res.error?.message || 'FarmBot sync failed');
      return;
    }
    showToast(`Synced ${res.data.synced} plant(s) from FarmBot`);
    await load();
  };

  const handleSaveToken = async (sourceId: string, token: string) => {
    const session = readSession();
    if (!session || !token.trim()) return;
    const res = await apiFetch(`/garden-sources/${sourceId}`, {
      method: 'PATCH',
      token: session.accessToken,
      body: JSON.stringify({ farmbotApiToken: token.trim() }),
    });
    if (!res.success) {
      setError(res.error?.message || 'Could not save FarmBot token');
      return;
    }
    showToast('FarmBot token saved');
    await load();
  };

  const handleDeleteSource = async (sourceId: string) => {
    const session = readSession();
    if (!session) return;
    if (!window.confirm('Delete this garden source and its plants?')) return;
    const res = await apiFetch(`/garden-sources/${sourceId}`, {
      method: 'DELETE',
      token: session.accessToken,
    });
    if (!res.success) {
      setError(res.error?.message || 'Could not delete source');
      return;
    }
    showToast('Garden source deleted');
    await load();
  };

  const handleCreateYield = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session?.householdId || !plantName.trim() || !plantSourceId) return;
    setSavingYield(true);
    setError(null);
    const res = await apiFetch('/garden-yields', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        householdId: session.householdId,
        gardenSourceId: plantSourceId,
        plantName: plantName.trim(),
        status: plantStatus,
        expectedHarvestStart: harvestStart || null,
        expectedHarvestEnd: harvestEnd || null,
        estimatedYieldQty: yieldQty ? Number(yieldQty) : null,
        estimatedYieldUnit: yieldUnit.trim() || null,
      }),
    });
    setSavingYield(false);
    if (!res.success) {
      setError(res.error?.message || 'Could not add plant');
      return;
    }
    setPlantName('');
    setHarvestStart('');
    setHarvestEnd('');
    setYieldQty('');
    setYieldUnit('');
    showToast('Plant added');
    await load();
  };

  const handleStatusChange = async (yieldId: string, status: GardenYield['status']) => {
    const session = readSession();
    if (!session) return;
    const res = await apiFetch(`/garden-yields/${yieldId}`, {
      method: 'PATCH',
      token: session.accessToken,
      body: JSON.stringify({ status }),
    });
    if (!res.success) {
      setError(res.error?.message || 'Could not update status');
      return;
    }
    await load();
  };

  const handleHarvest = async (yieldId: string) => {
    const session = readSession();
    if (!session) return;
    setHarvestingId(yieldId);
    setError(null);
    const res = await apiFetch(`/garden-yields/${yieldId}/harvest`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({}),
    });
    setHarvestingId(null);
    if (!res.success) {
      setError(res.error?.message || 'Harvest failed');
      return;
    }
    showToast('Harvested into pantry');
    await load();
  };

  const handleDeleteYield = async (yieldId: string) => {
    const session = readSession();
    if (!session) return;
    const res = await apiFetch(`/garden-yields/${yieldId}`, {
      method: 'DELETE',
      token: session.accessToken,
    });
    if (!res.success) {
      setError(res.error?.message || 'Could not delete plant');
      return;
    }
    await load();
  };

  return (
    <div className="stack page-gap">
      <header className="stack" style={{ gap: '0.35rem' }}>
        <h1>Garden</h1>
        <p className="muted" style={{ margin: 0 }}>
          Track outdoor beds, indoor trays, and FarmBot plants. Harvest flows into pantry; recipes
          prefer what is ready soon.
        </p>
        <Link
          className="btn btn-secondary"
          href="/app/garden/farmbot"
          aria-label="Open robot controls inside Marketlist"
        >
          Open robot controls
        </Link>
      </header>

      {toast ? (
        <p className="toast" role="status">
          {toast}
        </p>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="muted">Loading garden…</p> : null}

      {!loading && sources.length === 0 ? (
        <section className="stack" aria-label="Empty garden">
          <p>
            No garden sources yet. Add an outdoor bed, indoor tray (manual log — no closed-brand
            sync), or connect FarmBot.
          </p>
        </section>
      ) : null}

      <section className="card stack" aria-labelledby="add-source-heading">
        <h2 id="add-source-heading">Add garden source</h2>
        <form className="stack" onSubmit={handleCreateSource}>
          <label className="stack" style={{ gap: '0.25rem' }}>
            <span>Name</span>
            <input
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="Backyard bed / Kitchen tray / FarmBot"
              required
              aria-label="Garden source name"
            />
          </label>
          <label className="stack" style={{ gap: '0.25rem' }}>
            <span>Type</span>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as GardenSource['type'])}
              aria-label="Garden source type"
            >
              <option value="manual">Outdoor bed (manual)</option>
              <option value="indoor_tray">Indoor tray (manual log)</option>
              <option value="farmbot">FarmBot (API sync)</option>
            </select>
          </label>
          {sourceType === 'farmbot' ? (
            <>
              <label className="stack" style={{ gap: '0.25rem' }}>
                <span>Device id (optional)</span>
                <input
                  value={farmbotDeviceId}
                  onChange={(e) => setFarmbotDeviceId(e.target.value)}
                  placeholder="device_123"
                  aria-label="FarmBot device id"
                />
              </label>
              <label className="stack" style={{ gap: '0.25rem' }}>
                <span>API token</span>
                <textarea
                  value={farmbotToken}
                  onChange={(e) => setFarmbotToken(e.target.value)}
                  rows={3}
                  placeholder="Paste FarmBot encoded JWT or full /api/tokens JSON"
                  aria-label="FarmBot API token"
                />
              </label>
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                Token is encrypted at rest and never shown again. Create a token in FarmBot
                (Account → tokens / API) or via advanced authoring, then paste the encoded JWT or
                full token JSON here.
              </p>
            </>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Indoor closed systems (Gardyn, AeroGarden, etc.) have no public API — log harvests
              here manually.
            </p>
          )}
          <button type="submit" className="btn" disabled={savingSource} aria-label="Add garden source">
            {savingSource ? 'Saving…' : 'Add source'}
          </button>
        </form>
      </section>

      {sources.length > 0 ? (
        <section className="card stack" aria-labelledby="add-plant-heading">
          <h2 id="add-plant-heading">Add plant</h2>
          <form className="stack" onSubmit={handleCreateYield}>
            <label className="stack" style={{ gap: '0.25rem' }}>
              <span>Plant name</span>
              <input
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                placeholder="Basil"
                required
                aria-label="Plant name"
              />
            </label>
            <label className="stack" style={{ gap: '0.25rem' }}>
              <span>Source</span>
              <select
                value={plantSourceId}
                onChange={(e) => setPlantSourceId(e.target.value)}
                required
                aria-label="Plant garden source"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({SOURCE_LABEL[s.type]})
                  </option>
                ))}
              </select>
            </label>
            <label className="stack" style={{ gap: '0.25rem' }}>
              <span>Status</span>
              <select
                value={plantStatus}
                onChange={(e) => setPlantStatus(e.target.value as GardenYield['status'])}
                aria-label="Plant status"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
              <label className="stack" style={{ gap: '0.25rem', flex: 1, minWidth: '8rem' }}>
                <span>Harvest start</span>
                <input
                  type="date"
                  value={harvestStart}
                  onChange={(e) => setHarvestStart(e.target.value)}
                  aria-label="Expected harvest start"
                />
              </label>
              <label className="stack" style={{ gap: '0.25rem', flex: 1, minWidth: '8rem' }}>
                <span>Harvest end</span>
                <input
                  type="date"
                  value={harvestEnd}
                  onChange={(e) => setHarvestEnd(e.target.value)}
                  aria-label="Expected harvest end"
                />
              </label>
            </div>
            <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
              <label className="stack" style={{ gap: '0.25rem', flex: 1, minWidth: '6rem' }}>
                <span>Est. qty</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={yieldQty}
                  onChange={(e) => setYieldQty(e.target.value)}
                  aria-label="Estimated yield quantity"
                />
              </label>
              <label className="stack" style={{ gap: '0.25rem', flex: 1, minWidth: '6rem' }}>
                <span>Unit</span>
                <input
                  value={yieldUnit}
                  onChange={(e) => setYieldUnit(e.target.value)}
                  placeholder="bunch"
                  aria-label="Estimated yield unit"
                />
              </label>
            </div>
            <button type="submit" className="btn" disabled={savingYield} aria-label="Add plant">
              {savingYield ? 'Saving…' : 'Add plant'}
            </button>
          </form>
        </section>
      ) : null}

      {sources.map((source) => {
        const rows = yieldsBySource.get(source.id) || [];
        return (
          <section key={source.id} className="card stack" aria-labelledby={`source-${source.id}`}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 id={`source-${source.id}`} style={{ margin: 0 }}>
                  {source.name}
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  {SOURCE_LABEL[source.type]}
                  {source.type === 'farmbot'
                    ? source.hasFarmbotToken
                      ? ' · token connected'
                      : ' · token missing'
                    : null}
                  {source.lastSyncedAt
                    ? ` · synced ${new Date(source.lastSyncedAt).toLocaleString()}`
                    : null}
                </p>
              </div>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                {source.type === 'farmbot' ? (
                  <>
                    <Link
                      className="btn btn-secondary"
                      href={`/app/garden/farmbot?sourceId=${source.id}`}
                      aria-label={`Open robot controls for ${source.name}`}
                    >
                      Robot controls
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={syncingId === source.id || !source.hasFarmbotToken}
                      onClick={() => handleSync(source.id)}
                      aria-label={`Sync FarmBot ${source.name}`}
                    >
                      {syncingId === source.id ? 'Syncing…' : 'Sync FarmBot'}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleDeleteSource(source.id)}
                  aria-label={`Delete ${source.name}`}
                >
                  Delete
                </button>
              </div>
            </div>

            {source.type === 'farmbot' && !source.hasFarmbotToken ? (
              <FarmBotTokenForm
                onSave={(token) => handleSaveToken(source.id, token)}
              />
            ) : null}

            {rows.length === 0 ? (
              <p className="muted">No plants yet on this source.</p>
            ) : (
              <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, gap: '0.75rem' }}>
                {rows.map((row) => (
                  <li key={row.id} className="stack" style={{ gap: '0.35rem' }}>
                    <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <strong>{row.plantName}</strong>
                      <select
                        value={row.status}
                        onChange={(e) =>
                          handleStatusChange(row.id, e.target.value as GardenYield['status'])
                        }
                        aria-label={`Status for ${row.plantName}`}
                        disabled={row.status === 'harvested'}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                      {row.expectedHarvestStart || row.expectedHarvestEnd
                        ? `Harvest window: ${row.expectedHarvestStart || '—'} → ${row.expectedHarvestEnd || '—'}`
                        : 'No harvest window set'}
                      {row.estimatedYieldQty
                        ? ` · ~${row.estimatedYieldQty}${row.estimatedYieldUnit ? ` ${row.estimatedYieldUnit}` : ''}`
                        : null}
                      {row.farmbotPlantId ? ` · FarmBot #${row.farmbotPlantId}` : null}
                    </p>
                    <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                      {row.status !== 'harvested' ? (
                        <button
                          type="button"
                          className="btn"
                          disabled={harvestingId === row.id}
                          onClick={() => handleHarvest(row.id)}
                          aria-label={`Harvest ${row.plantName} to pantry`}
                        >
                          {harvestingId === row.id ? 'Harvesting…' : 'Harvest → pantry'}
                        </button>
                      ) : (
                        <span className="muted">In pantry</span>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleDeleteYield(row.id)}
                        aria-label={`Delete ${row.plantName}`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

const FarmBotTokenForm = ({ onSave }: { onSave: (token: string) => void }) => {
  const [token, setToken] = useState('');
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(token);
        setToken('');
      }}
    >
      <label className="stack" style={{ gap: '0.25rem' }}>
        <span>Connect FarmBot token</span>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={2}
          required
          aria-label="Paste FarmBot token"
        />
      </label>
      <button type="submit" className="btn btn-secondary" aria-label="Save FarmBot token">
        Save token
      </button>
    </form>
  );
};
