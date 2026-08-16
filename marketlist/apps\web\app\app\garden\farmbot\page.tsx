'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch, readSession } from '../../../../lib/api';

const FARMBOT_ADVANCED_URL =
  process.env.NEXT_PUBLIC_FARMBOT_PUBLIC_URL || 'https://farmbot.kecktech.net';

type GardenSource = {
  id: string;
  type: string;
  name: string;
  hasFarmbotToken: boolean;
};

type RobotStatus = {
  sourceId: string;
  mqttConnected: boolean;
  lastStatusAt: string | null;
  locked: boolean;
  busy: boolean;
  syncStatus: string | null;
  position: { x: unknown; y: unknown; z: unknown } | null;
  recentLogs: Record<string, unknown>[];
};

type SequenceRow = { id: number; name: string; color?: string | null };
type PeripheralRow = { id: number; label?: string; name?: string; pin: number };
type ImageRow = {
  id: number;
  attachment_url?: string;
  meta?: { x?: number; y?: number; z?: number };
  created_at?: string;
};
type LogRow = {
  id?: number;
  message?: string;
  type?: string;
  created_at?: string;
};

const confirmAction = (label: string) =>
  typeof window !== 'undefined' && window.confirm(`Confirm: ${label}?`);

const FarmBotRobotInner = () => {
  const searchParams = useSearchParams();
  const sourceIdParam = searchParams.get('sourceId') || '';

  const [sources, setSources] = useState<GardenSource[]>([]);
  const [sourceId, setSourceId] = useState(sourceIdParam);
  const [status, setStatus] = useState<RobotStatus | null>(null);
  const [device, setDevice] = useState<Record<string, unknown> | null>(null);
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [regimens, setRegimens] = useState<Record<string, unknown>[]>([]);
  const [farmEvents, setFarmEvents] = useState<Record<string, unknown>[]>([]);
  const [peripherals, setPeripherals] = useState<PeripheralRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [moveX, setMoveX] = useState('0');
  const [moveY, setMoveY] = useState('0');
  const [moveZ, setMoveZ] = useState('0');

  const [plantName, setPlantName] = useState('');
  const [plantX, setPlantX] = useState('100');
  const [plantY, setPlantY] = useState('100');
  const [plantZ, setPlantZ] = useState('0');

  const farmbotSources = useMemo(
    () => sources.filter((s) => s.type === 'farmbot' && s.hasFarmbotToken),
    [sources],
  );

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2800);
  };

  const token = () => readSession()?.accessToken || '';

  const loadSources = useCallback(async () => {
    const session = readSession();
    if (!session?.householdId) {
      setError('Join or create a household to control FarmBot.');
      return;
    }
    const res = await apiFetch<{ sources: GardenSource[] }>(
      `/garden-sources?householdId=${session.householdId}`,
      { token: session.accessToken },
    );
    if (!res.success) {
      setError(res.error?.message || 'Could not load garden sources');
      return;
    }
    setSources(res.data.sources);
    const farmbots = res.data.sources.filter((s) => s.type === 'farmbot' && s.hasFarmbotToken);
    setSourceId((prev) => {
      if (prev && farmbots.some((s) => s.id === prev)) return prev;
      if (sourceIdParam && farmbots.some((s) => s.id === sourceIdParam)) return sourceIdParam;
      return farmbots[0]?.id || '';
    });
  }, [sourceIdParam]);

  const loadRobotData = useCallback(async () => {
    if (!sourceId) return;
    const t = token();
    const [statusRes, deviceRes, seqRes, regRes, evRes, periRes, imgRes, logRes] =
      await Promise.all([
        apiFetch<RobotStatus>(`/garden-sources/${sourceId}/farmbot/status`, { token: t }),
        apiFetch<{ device: Record<string, unknown> }>(
          `/garden-sources/${sourceId}/farmbot/device`,
          { token: t },
        ),
        apiFetch<{ sequences: SequenceRow[] }>(
          `/garden-sources/${sourceId}/farmbot/sequences`,
          { token: t },
        ),
        apiFetch<{ regimens: Record<string, unknown>[] }>(
          `/garden-sources/${sourceId}/farmbot/regimens`,
          { token: t },
        ),
        apiFetch<{ farmEvents: Record<string, unknown>[] }>(
          `/garden-sources/${sourceId}/farmbot/farm-events`,
          { token: t },
        ),
        apiFetch<{ peripherals: PeripheralRow[] }>(
          `/garden-sources/${sourceId}/farmbot/peripherals`,
          { token: t },
        ),
        apiFetch<{ images: ImageRow[] }>(`/garden-sources/${sourceId}/farmbot/images`, {
          token: t,
        }),
        apiFetch<{ logs: LogRow[]; recentLogs: LogRow[] }>(
          `/garden-sources/${sourceId}/farmbot/logs`,
          { token: t },
        ),
      ]);

    if (statusRes.success) setStatus(statusRes.data);
    if (deviceRes.success) setDevice(deviceRes.data.device);
    if (seqRes.success) setSequences(seqRes.data.sequences);
    if (regRes.success) setRegimens(regRes.data.regimens);
    if (evRes.success) setFarmEvents(evRes.data.farmEvents);
    if (periRes.success) setPeripherals(periRes.data.peripherals);
    if (imgRes.success) setImages(imgRes.data.images.slice(0, 24));
    if (logRes.success) {
      const merged = [...(logRes.data.recentLogs || []), ...(logRes.data.logs || [])];
      setLogs(merged.slice(0, 40));
    }
  }, [sourceId]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  useEffect(() => {
    if (!sourceId) return;
    void loadRobotData();
    const id = setInterval(() => {
      void (async () => {
        const res = await apiFetch<RobotStatus>(`/garden-sources/${sourceId}/farmbot/status`, {
          token: token(),
        });
        if (res.success) setStatus(res.data);
      })();
    }, 2000);
    return () => clearInterval(id);
  }, [sourceId, loadRobotData]);

  const postConfirm = async (path: string, body: Record<string, unknown>, label: string) => {
    if (!sourceId) return;
    if (!confirmAction(label)) return;
    setBusyAction(label);
    setError(null);
    const res = await apiFetch(`/garden-sources/${sourceId}/farmbot/${path}`, {
      method: 'POST',
      token: token(),
      body: JSON.stringify({ confirm: true, ...body }),
    });
    setBusyAction(null);
    if (!res.success) {
      setError(res.error?.message || `${label} failed`);
      return;
    }
    showToast(label);
    await loadRobotData();
  };

  const handleMove = async (e: FormEvent) => {
    e.preventDefault();
    await postConfirm(
      'move',
      {
        x: Number(moveX),
        y: Number(moveY),
        z: Number(moveZ),
      },
      'Move to coordinates',
    );
  };

  const handleCreatePlant = async (e: FormEvent) => {
    e.preventDefault();
    if (!sourceId || !plantName.trim()) return;
    setBusyAction('Create plant');
    setError(null);
    const res = await apiFetch(`/garden-sources/${sourceId}/farmbot/points`, {
      method: 'POST',
      token: token(),
      body: JSON.stringify({
        name: plantName.trim(),
        x: Number(plantX),
        y: Number(plantY),
        z: Number(plantZ),
      }),
    });
    setBusyAction(null);
    if (!res.success) {
      setError(res.error?.message || 'Could not create plant on FarmBot');
      return;
    }
    setPlantName('');
    showToast('Plant created on FarmBot');
    await apiFetch(`/garden-sources/${sourceId}/sync`, {
      method: 'POST',
      token: token(),
    });
  };

  const selectedName =
    farmbotSources.find((s) => s.id === sourceId)?.name || 'FarmBot';

  return (
    <div className="stack page-gap">
      <header className="stack" style={{ gap: '0.35rem' }}>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="stack" style={{ gap: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>Robot controls</h1>
            <p className="muted" style={{ margin: 0 }}>
              Native Marketlist controls for {selectedName}. Status, safety, sequences, and harvest
              stay in-app.
            </p>
          </div>
          <Link className="btn btn-secondary" href="/app/garden" aria-label="Back to Garden">
            Back to Garden
          </Link>
        </div>
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

      {farmbotSources.length === 0 ? (
        <section className="card stack" aria-label="No FarmBot source">
          <p>
            Connect a FarmBot source with an API token on the Garden page, then open robot
            controls from that source.
          </p>
          <Link className="btn" href="/app/garden" aria-label="Go to Garden to connect FarmBot">
            Go to Garden
          </Link>
        </section>
      ) : (
        <label className="stack" style={{ gap: '0.25rem', maxWidth: '24rem' }}>
          <span>FarmBot source</span>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            aria-label="Select FarmBot source"
          >
            {farmbotSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {sourceId ? (
        <>
          <section className="card stack" aria-labelledby="status-heading">
            <h2 id="status-heading">Status</h2>
            <dl className="stack" style={{ gap: '0.35rem', margin: 0 }}>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <dt className="muted">MQTT</dt>
                <dd style={{ margin: 0 }}>
                  {status?.mqttConnected ? 'Connected' : 'Disconnected'}
                </dd>
              </div>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <dt className="muted">E-stop</dt>
                <dd style={{ margin: 0 }}>{status?.locked ? 'LOCKED' : 'Unlocked'}</dd>
              </div>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <dt className="muted">Busy</dt>
                <dd style={{ margin: 0 }}>{status?.busy ? 'Yes' : 'No'}</dd>
              </div>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <dt className="muted">Sync</dt>
                <dd style={{ margin: 0 }}>{String(status?.syncStatus || '—')}</dd>
              </div>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <dt className="muted">Position</dt>
                <dd style={{ margin: 0 }}>
                  {status?.position
                    ? `X ${String(status.position.x)} · Y ${String(status.position.y)} · Z ${String(status.position.z)}`
                    : '—'}
                </dd>
              </div>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <dt className="muted">Device</dt>
                <dd style={{ margin: 0 }}>
                  {device ? String(device.name || device.id || '—') : '—'}
                </dd>
              </div>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <dt className="muted">Last status</dt>
                <dd style={{ margin: 0 }}>
                  {status?.lastStatusAt
                    ? new Date(status.lastStatusAt).toLocaleString()
                    : 'Waiting for MQTT status…'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card stack" aria-labelledby="safety-heading">
            <h2 id="safety-heading">Safety</h2>
            <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                style={{ background: '#b42318', borderColor: '#b42318' }}
                disabled={Boolean(busyAction)}
                onClick={() => postConfirm('estop', {}, 'Emergency stop')}
                aria-label="Emergency stop FarmBot"
              >
                E-stop
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={Boolean(busyAction)}
                onClick={() => postConfirm('unlock', {}, 'Unlock FarmBot')}
                aria-label="Unlock FarmBot after e-stop"
              >
                Unlock
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={Boolean(busyAction)}
                onClick={() => postConfirm('sync', {}, 'Sync device')}
                aria-label="Request FarmBot device sync"
              >
                Device sync
              </button>
            </div>
          </section>

          <section className="card stack" aria-labelledby="motion-heading">
            <h2 id="motion-heading">Motion</h2>
            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={Boolean(busyAction)}
                onClick={() => postConfirm('home', { axis: 'all' }, 'Home all axes')}
                aria-label="Home all axes"
              >
                Home
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={Boolean(busyAction)}
                onClick={() =>
                  postConfirm('home', { axis: 'all', findHome: true }, 'Find home all axes')
                }
                aria-label="Find home all axes"
              >
                Find home
              </button>
            </div>
            <form className="stack" onSubmit={handleMove}>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <label className="stack" style={{ gap: '0.25rem' }}>
                  <span>X</span>
                  <input
                    value={moveX}
                    onChange={(e) => setMoveX(e.target.value)}
                    inputMode="decimal"
                    aria-label="Move X"
                    required
                  />
                </label>
                <label className="stack" style={{ gap: '0.25rem' }}>
                  <span>Y</span>
                  <input
                    value={moveY}
                    onChange={(e) => setMoveY(e.target.value)}
                    inputMode="decimal"
                    aria-label="Move Y"
                    required
                  />
                </label>
                <label className="stack" style={{ gap: '0.25rem' }}>
                  <span>Z</span>
                  <input
                    value={moveZ}
                    onChange={(e) => setMoveZ(e.target.value)}
                    inputMode="decimal"
                    aria-label="Move Z"
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                className="btn"
                disabled={Boolean(busyAction)}
                aria-label="Move FarmBot to coordinates"
              >
                Move absolute
              </button>
            </form>
          </section>

          <section className="card stack" aria-labelledby="sequences-heading">
            <h2 id="sequences-heading">Sequences</h2>
            {sequences.length === 0 ? (
              <p className="muted">No sequences on this device yet.</p>
            ) : (
              <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, gap: '0.5rem' }}>
                {sequences.map((seq) => (
                  <li
                    key={seq.id}
                    className="row"
                    style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}
                  >
                    <span>{seq.name}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        postConfirm(`sequences/${seq.id}/exec`, {}, `Run ${seq.name}`)
                      }
                      aria-label={`Run sequence ${seq.name}`}
                    >
                      Run
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card stack" aria-labelledby="schedule-heading">
            <h2 id="schedule-heading">Schedule</h2>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Regimens</h3>
            {regimens.length === 0 ? (
              <p className="muted">No regimens.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {regimens.map((r) => (
                  <li key={String(r.id)}>{String(r.name || r.id)}</li>
                ))}
              </ul>
            )}
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Farm events</h3>
            {farmEvents.length === 0 ? (
              <p className="muted">No farm events.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {farmEvents.map((ev) => (
                  <li key={String(ev.id)}>
                    {String(ev.executable_type || 'Event')} #{String(ev.executable_id || ev.id)}
                    {ev.start_time ? ` · ${String(ev.start_time)}` : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card stack" aria-labelledby="peripherals-heading">
            <h2 id="peripherals-heading">Peripherals</h2>
            {peripherals.length === 0 ? (
              <p className="muted">No peripherals configured.</p>
            ) : (
              <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, gap: '0.5rem' }}>
                {peripherals.map((p) => (
                  <li
                    key={p.id}
                    className="row"
                    style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}
                  >
                    <span>
                      {p.label || p.name || `Pin ${p.pin}`} (pin {p.pin})
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        postConfirm(
                          `peripherals/${p.id}/toggle`,
                          {},
                          `Toggle ${p.label || p.name || p.pin}`,
                        )
                      }
                      aria-label={`Toggle peripheral ${p.label || p.name || p.pin}`}
                    >
                      Toggle
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card stack" aria-labelledby="plants-heading">
            <h2 id="plants-heading">Add plant on FarmBot</h2>
            <form className="stack" onSubmit={handleCreatePlant}>
              <label className="stack" style={{ gap: '0.25rem' }}>
                <span>Name</span>
                <input
                  value={plantName}
                  onChange={(e) => setPlantName(e.target.value)}
                  required
                  aria-label="New FarmBot plant name"
                />
              </label>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <label className="stack" style={{ gap: '0.25rem' }}>
                  <span>X</span>
                  <input
                    value={plantX}
                    onChange={(e) => setPlantX(e.target.value)}
                    aria-label="Plant X"
                    required
                  />
                </label>
                <label className="stack" style={{ gap: '0.25rem' }}>
                  <span>Y</span>
                  <input
                    value={plantY}
                    onChange={(e) => setPlantY(e.target.value)}
                    aria-label="Plant Y"
                    required
                  />
                </label>
                <label className="stack" style={{ gap: '0.25rem' }}>
                  <span>Z</span>
                  <input
                    value={plantZ}
                    onChange={(e) => setPlantZ(e.target.value)}
                    aria-label="Plant Z"
                  />
                </label>
              </div>
              <button type="submit" className="btn" disabled={Boolean(busyAction)} aria-label="Create FarmBot plant">
                Create plant
              </button>
            </form>
          </section>

          <section className="card stack" aria-labelledby="photos-heading">
            <h2 id="photos-heading">Photos</h2>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={Boolean(busyAction)}
              onClick={() => postConfirm('photos/take', {}, 'Take photo')}
              aria-label="Take FarmBot photo"
            >
              Take photo
            </button>
            {images.length === 0 ? (
              <p className="muted">No images yet.</p>
            ) : (
              <div
                className="row"
                style={{ gap: '0.75rem', flexWrap: 'wrap' }}
                aria-label="FarmBot photo gallery"
              >
                {images.map((img) =>
                  img.attachment_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={img.attachment_url}
                      alt={`FarmBot photo ${img.id}`}
                      style={{
                        width: 120,
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid var(--border, #D5E0D8)',
                      }}
                    />
                  ) : (
                    <span key={img.id} className="muted">
                      Image #{img.id}
                    </span>
                  ),
                )}
              </div>
            )}
          </section>

          <section className="card stack" aria-labelledby="logs-heading">
            <h2 id="logs-heading">Logs</h2>
            {logs.length === 0 ? (
              <p className="muted">No recent logs.</p>
            ) : (
              <ul
                className="stack"
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  gap: '0.35rem',
                  maxHeight: 280,
                  overflow: 'auto',
                }}
              >
                {logs.map((log, idx) => (
                  <li key={String(log.id ?? idx)} className="muted" style={{ fontSize: '0.85rem' }}>
                    {log.created_at ? `${new Date(String(log.created_at)).toLocaleString()} · ` : null}
                    {String(log.message || JSON.stringify(log))}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Need to edit the farm map or sequence steps?{' '}
            <a
              href={FARMBOT_ADVANCED_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open FarmBot advanced authoring in a new tab"
            >
              Advanced authoring (FarmBot designer)
            </a>
            — break-glass only; day-to-day control stays here.
          </p>
        </>
      ) : null}
    </div>
  );
};

export default function FarmBotRobotPage() {
  return (
    <Suspense fallback={<p className="muted">Loading robot controls…</p>}>
      <FarmBotRobotInner />
    </Suspense>
  );
}
