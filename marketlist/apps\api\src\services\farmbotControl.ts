import { randomUUID } from 'crypto';
import mqtt, { MqttClient } from 'mqtt';
import { GardenSource } from '../models';
import { FarmBotTokenClaims, parseFarmBotTokenInput } from './farmbot';
import { decryptSecret } from './tokenCrypto';
import { AppError } from '../utils/http';

type CeleryNode = {
  kind: string;
  args: Record<string, unknown>;
  body?: CeleryNode[];
};

type PendingRpc = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type ControlSession = {
  sourceId: string;
  client: MqttClient;
  bot: string;
  connected: boolean;
  lastStatus: Record<string, unknown> | null;
  lastStatusAt: Date | null;
  recentLogs: Record<string, unknown>[];
  pending: Map<string, PendingRpc>;
};

const sessions = new Map<string, ControlSession>();
const LOG_RING_SIZE = 50;
const RPC_TIMEOUT_MS = 15_000;

const cs = (kind: string, args: Record<string, unknown> = {}, body?: CeleryNode[]): CeleryNode => ({
  kind,
  args,
  ...(body ? { body } : {}),
});

const connectSession = (source: GardenSource, claims: FarmBotTokenClaims) => {
  const existing = sessions.get(source.id);
  if (existing) {
    for (const [, p] of existing.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('FarmBot control reconnecting'));
    }
    existing.client.end(true);
    sessions.delete(source.id);
  }

  const url = `mqtts://${claims.mqtt}:8883`;
  const client = mqtt.connect(url, {
    username: claims.bot,
    password: claims.encoded,
    clientId: `marketlist_ctl_${source.id.slice(0, 8)}_${Date.now()}`,
    clean: true,
    reconnectPeriod: 10_000,
    connectTimeout: 30_000,
    protocolVersion: 4,
  });

  const session: ControlSession = {
    sourceId: source.id,
    client,
    bot: claims.bot,
    connected: false,
    lastStatus: null,
    lastStatusAt: null,
    recentLogs: [],
    pending: new Map(),
  };

  const statusTopic = `bot/${claims.bot}/status`;
  const logsTopic = `bot/${claims.bot}/logs`;
  const fromDeviceTopic = `bot/${claims.bot}/from_device`;

  client.on('connect', () => {
    session.connected = true;
    client.subscribe([statusTopic, logsTopic, fromDeviceTopic], { qos: 0 }, (err) => {
      if (err) {
        console.error(`[farmbot-control] subscribe failed source=${source.id}`, err.message);
      }
    });
  });

  client.on('close', () => {
    session.connected = false;
  });

  client.on('offline', () => {
    session.connected = false;
  });

  client.on('message', (topic, payload) => {
    try {
      const text = payload.toString('utf8');
      if (!text) return;
      const parsed = JSON.parse(text) as Record<string, unknown>;

      if (topic === statusTopic || topic.endsWith('/status')) {
        session.lastStatus = parsed;
        session.lastStatusAt = new Date();
        return;
      }

      if (topic === logsTopic || topic.endsWith('/logs')) {
        session.recentLogs.unshift(parsed);
        if (session.recentLogs.length > LOG_RING_SIZE) {
          session.recentLogs.length = LOG_RING_SIZE;
        }
        return;
      }

      if (topic === fromDeviceTopic || topic.endsWith('/from_device')) {
        const args = (parsed.args || {}) as Record<string, unknown>;
        const label = String(args.label || '');
        if (!label) return;
        const pending = session.pending.get(label);
        if (!pending) return;
        clearTimeout(pending.timer);
        session.pending.delete(label);
        const kind = String(parsed.kind || '');
        if (kind === 'rpc_error') {
          pending.reject(new Error('FarmBot RPC error'));
          return;
        }
        pending.resolve(parsed);
      }
    } catch (err) {
      console.error(`[farmbot-control] message error source=${source.id}`, err);
    }
  });

  client.on('error', (err) => {
    console.error(`[farmbot-control] error source=${source.id}`, err.message);
  });

  sessions.set(source.id, session);
};

const requireSession = (sourceId: string): ControlSession => {
  const session = sessions.get(sourceId);
  if (!session) {
    throw new AppError('FarmBot control channel not connected', 503, 'FARMBOT_CONTROL_OFFLINE');
  }
  return session;
};

const publishRpc = async (
  sourceId: string,
  inner: CeleryNode,
): Promise<unknown> => {
  const session = requireSession(sourceId);
  if (!session.client.connected) {
    throw new AppError('FarmBot MQTT not connected', 503, 'FARMBOT_CONTROL_OFFLINE');
  }

  const label = randomUUID();
  const rpc = cs('rpc_request', { label, priority: 600 }, [inner]);
  const topic = `bot/${session.bot}/from_clients`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      session.pending.delete(label);
      reject(new AppError('FarmBot command timed out', 504, 'FARMBOT_RPC_TIMEOUT'));
    }, RPC_TIMEOUT_MS);

    session.pending.set(label, {
      resolve,
      reject,
      timer,
    });

    session.client.publish(topic, JSON.stringify(rpc), { qos: 0 }, (err) => {
      if (!err) return;
      clearTimeout(timer);
      session.pending.delete(label);
      reject(new AppError(`FarmBot publish failed: ${err.message}`, 502, 'FARMBOT_RPC_ERROR'));
    });
  });
};

export const stopFarmBotControl = (sourceId: string) => {
  const session = sessions.get(sourceId);
  if (!session) return;
  for (const [, p] of session.pending) {
    clearTimeout(p.timer);
    p.reject(new Error('FarmBot control stopped'));
  }
  session.client.end(true);
  sessions.delete(sourceId);
};

export const startFarmBotControlForSource = async (source: GardenSource) => {
  if (source.type !== 'farmbot' || !source.farmbotApiToken) {
    stopFarmBotControl(source.id);
    return;
  }
  try {
    const plain = decryptSecret(source.farmbotApiToken);
    const claims = parseFarmBotTokenInput(plain);
    connectSession(source, claims);
  } catch (err) {
    console.error(`[farmbot-control] failed to start source=${source.id}`, err);
    stopFarmBotControl(source.id);
  }
};

export const bootstrapFarmBotControl = async () => {
  const sources = await GardenSource.findAll({ where: { type: 'farmbot' } });
  for (const source of sources) {
    if (!source.farmbotApiToken) continue;
    await startFarmBotControlForSource(source);
  }
  console.log(`[farmbot-control] bootstrapped ${sessions.size} session(s)`);
};

export const getFarmBotCachedStatus = (sourceId: string) => {
  const session = sessions.get(sourceId);
  return {
    mqttConnected: Boolean(session?.client.connected),
    lastStatus: session?.lastStatus ?? null,
    lastStatusAt: session?.lastStatusAt?.toISOString() ?? null,
    recentLogs: session?.recentLogs ?? [],
  };
};

export const emergencyLock = (sourceId: string) =>
  publishRpc(sourceId, cs('emergency_lock', {}));

export const emergencyUnlock = (sourceId: string) =>
  publishRpc(sourceId, cs('emergency_unlock', {}));

export const execSequence = (sourceId: string, sequenceId: number) =>
  publishRpc(sourceId, cs('execute', { sequence_id: sequenceId }));

export const readStatus = (sourceId: string) =>
  publishRpc(sourceId, cs('read_status', {}));

export const home = (sourceId: string, axis: 'all' | 'x' | 'y' | 'z' = 'all') =>
  publishRpc(sourceId, cs('home', { axis, speed: 100 }));

export const findHome = (sourceId: string, axis: 'all' | 'x' | 'y' | 'z' = 'all') =>
  publishRpc(sourceId, cs('find_home', { axis, speed: 100 }));

export const moveAbsolute = (
  sourceId: string,
  coords: { x: number; y: number; z: number; speed?: number },
) =>
  publishRpc(
    sourceId,
    cs('move_absolute', {
      location: cs('coordinate', { x: coords.x, y: coords.y, z: coords.z }),
      offset: cs('coordinate', { x: 0, y: 0, z: 0 }),
      speed: coords.speed ?? 100,
    }),
  );

export const togglePin = (sourceId: string, pinNumber: number) =>
  publishRpc(sourceId, cs('toggle_pin', { pin_number: pinNumber }));

export const writePin = (
  sourceId: string,
  pinNumber: number,
  pinValue: number,
  pinMode: number = 0,
) =>
  publishRpc(sourceId, cs('write_pin', { pin_number: pinNumber, pin_value: pinValue, pin_mode: pinMode }));

export const takePhoto = (sourceId: string) =>
  publishRpc(sourceId, cs('take_photo', {}));

export const requestSync = (sourceId: string) =>
  publishRpc(sourceId, cs('sync', {}));

export const farmBotControlActiveCount = () => sessions.size;

/** Test helper: build CeleryScript RPC envelope without MQTT. */
export const buildRpcEnvelopeForTest = (inner: CeleryNode, label: string) =>
  cs('rpc_request', { label, priority: 600 }, [inner]);

export const celeryHelpersForTest = {
  cs,
  emergencyLockNode: () => cs('emergency_lock', {}),
  execSequenceNode: (sequenceId: number) => cs('execute', { sequence_id: sequenceId }),
  moveAbsoluteNode: (x: number, y: number, z: number, speed = 100) =>
    cs('move_absolute', {
      location: cs('coordinate', { x, y, z }),
      offset: cs('coordinate', { x: 0, y: 0, z: 0 }),
      speed,
    }),
};
