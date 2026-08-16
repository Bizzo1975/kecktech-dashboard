import { AppError } from '../utils/http';

export type FarmBotTokenClaims = {
  encoded: string;
  iss: string;
  mqtt: string;
  mqttWs?: string;
  bot: string;
  vhost: string;
  exp?: number;
};

export type FarmBotPlantPoint = {
  id: number;
  name: string;
  pointer_type: string;
  plant_stage?: string | null;
  planted_at?: string | null;
  openfarm_slug?: string | null;
  discarded_at?: string | null;
  x?: number | null;
  y?: number | null;
  z?: number | null;
  radius?: number | null;
};

export type MappedYieldStatus = 'planted' | 'growing' | 'ready' | 'harvested';

export type MappedPlantYield = {
  farmbotPlantId: string;
  plantName: string;
  status: MappedYieldStatus;
  expectedHarvestStart: string | null;
  expectedHarvestEnd: string | null;
};

export type FarmBotPlantPointInput = {
  name: string;
  x: number;
  y: number;
  z?: number;
  radius?: number;
  plant_stage?: string;
  planted_at?: string | null;
  openfarm_slug?: string | null;
  pointer_type?: 'Plant';
};

const DEFAULT_ISS = 'https://my.farm.bot';

/** Parse user paste: encoded JWT string or full FarmBot /api/tokens JSON. */
export const parseFarmBotTokenInput = (raw: string): FarmBotTokenClaims => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new AppError('FarmBot token is required', 400, 'VALIDATION_ERROR');
  }

  let encoded = trimmed;
  let unencoded: Record<string, unknown> | null = null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        token?: { encoded?: string; unencoded?: Record<string, unknown> };
        encoded?: string;
        unencoded?: Record<string, unknown>;
      };
      encoded = parsed.token?.encoded || parsed.encoded || '';
      unencoded = parsed.token?.unencoded || parsed.unencoded || null;
      if (!encoded) {
        throw new AppError('FarmBot token JSON missing encoded token', 400, 'VALIDATION_ERROR');
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('Invalid FarmBot token JSON', 400, 'VALIDATION_ERROR');
    }
  }

  if (!unencoded) {
    unencoded = decodeJwtPayload(encoded);
  }

  const issRaw = String(unencoded.iss || '//my.farm.bot:443');
  const iss = normalizeIss(issRaw);
  const mqtt = String(unencoded.mqtt || '');
  const bot = String(unencoded.bot || '');
  const vhost = String(unencoded.vhost || '/');
  const mqttWs = unencoded.mqtt_ws ? String(unencoded.mqtt_ws) : undefined;
  const exp = typeof unencoded.exp === 'number' ? unencoded.exp : undefined;

  if (!mqtt || !bot) {
    throw new AppError(
      'FarmBot token is missing mqtt/bot claims — paste the full token from FarmBot or a fresh JWT',
      400,
      'VALIDATION_ERROR',
    );
  }

  return { encoded, iss, mqtt, bot, vhost, mqttWs, exp };
};

const normalizeIss = (iss: string): string => {
  let value = iss.trim();
  if (value.startsWith('//')) value = `https:${value}`;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  return value.replace(/:443(?=\/|$)/, '').replace(/\/$/, '') || DEFAULT_ISS;
};

const decodeJwtPayload = (encoded: string): Record<string, unknown> => {
  const parts = encoded.split('.');
  if (parts.length < 2) {
    throw new AppError('Invalid FarmBot JWT', 400, 'VALIDATION_ERROR');
  }
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new AppError('Could not decode FarmBot JWT payload', 400, 'VALIDATION_ERROR');
  }
};

const farmBotHeaders = (claims: FarmBotTokenClaims): HeadersInit => ({
  Authorization: `Bearer ${claims.encoded}`,
  'content-type': 'application/json',
  Accept: 'application/json',
});

const throwFarmBotHttpError = (status: number, context: string): never => {
  if (status === 401 || status === 403) {
    throw new AppError('FarmBot rejected the API token', 400, 'FARMBOT_AUTH');
  }
  if (status === 404) {
    throw new AppError(`FarmBot resource not found (${context})`, 404, 'FARMBOT_NOT_FOUND');
  }
  throw new AppError(`FarmBot API error (${status}) for ${context}`, 502, 'FARMBOT_API_ERROR');
};

const farmBotFetch = async <T>(
  claims: FarmBotTokenClaims,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const url = `${claims.iss}/api${path.startsWith('/') ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...farmBotHeaders(claims),
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new AppError(`FarmBot API unreachable (${path})`, 502, 'FARMBOT_API_ERROR');
  }
  if (!res.ok) {
    throwFarmBotHttpError(res.status, path);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AppError(`Unexpected FarmBot response for ${path}`, 502, 'FARMBOT_API_ERROR');
  }
};

export const mapPlantStageToStatus = (stage: string | null | undefined): MappedYieldStatus => {
  const s = (stage || '').toLowerCase();
  if (s === 'harvested') return 'harvested';
  if (s === 'sprouted') return 'ready';
  if (s === 'planted') return 'growing';
  if (s === 'planned') return 'planted';
  return 'planted';
};

/** Soft harvest window: planted_at + 45–75 days when FarmBot does not provide maturity. */
export const estimateHarvestWindow = (
  plantedAt: string | null | undefined,
): { start: string | null; end: string | null } => {
  if (!plantedAt) return { start: null, end: null };
  const dayKey = plantedAt.slice(0, 10);
  const parts = dayKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return { start: null, end: null };
  const [y, m, d] = parts;
  const start = new Date(Date.UTC(y, m - 1, d));
  start.setUTCDate(start.getUTCDate() + 45);
  const end = new Date(Date.UTC(y, m - 1, d));
  end.setUTCDate(end.getUTCDate() + 75);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

export const mapFarmBotPointToYield = (point: FarmBotPlantPoint): MappedPlantYield | null => {
  if (point.discarded_at) return null;
  if ((point.pointer_type || '').toLowerCase() !== 'plant') return null;
  const plantName = (point.name || point.openfarm_slug || 'Plant').trim();
  if (!plantName) return null;
  const window = estimateHarvestWindow(point.planted_at);
  return {
    farmbotPlantId: String(point.id),
    plantName,
    status: mapPlantStageToStatus(point.plant_stage),
    expectedHarvestStart: window.start,
    expectedHarvestEnd: window.end,
  };
};

export const fetchFarmBotPlantPoints = async (
  claims: FarmBotTokenClaims,
): Promise<FarmBotPlantPoint[]> => {
  const data = await farmBotFetch<unknown>(claims, '/points');
  if (!Array.isArray(data)) {
    throw new AppError('Unexpected FarmBot points response', 502, 'FARMBOT_API_ERROR');
  }
  return data as FarmBotPlantPoint[];
};

export const syncMappedYieldsFromClaims = async (
  claims: FarmBotTokenClaims,
): Promise<MappedPlantYield[]> => {
  const points = await fetchFarmBotPlantPoints(claims);
  return points
    .map(mapFarmBotPointToYield)
    .filter((y): y is MappedPlantYield => y !== null);
};

export const fetchDevice = async (claims: FarmBotTokenClaims): Promise<Record<string, unknown>> => {
  const data = await farmBotFetch<Record<string, unknown>>(claims, '/device');
  return data || {};
};

export const fetchSequences = async (
  claims: FarmBotTokenClaims,
): Promise<Record<string, unknown>[]> => {
  const data = await farmBotFetch<unknown>(claims, '/sequences');
  if (!Array.isArray(data)) {
    throw new AppError('Unexpected FarmBot sequences response', 502, 'FARMBOT_API_ERROR');
  }
  return data as Record<string, unknown>[];
};

export const fetchSequence = async (
  claims: FarmBotTokenClaims,
  sequenceId: number | string,
): Promise<Record<string, unknown>> => {
  return farmBotFetch<Record<string, unknown>>(claims, `/sequences/${sequenceId}`);
};

export const fetchRegimens = async (
  claims: FarmBotTokenClaims,
): Promise<Record<string, unknown>[]> => {
  const data = await farmBotFetch<unknown>(claims, '/regimens');
  if (!Array.isArray(data)) {
    throw new AppError('Unexpected FarmBot regimens response', 502, 'FARMBOT_API_ERROR');
  }
  return data as Record<string, unknown>[];
};

export const fetchFarmEvents = async (
  claims: FarmBotTokenClaims,
): Promise<Record<string, unknown>[]> => {
  const data = await farmBotFetch<unknown>(claims, '/farm_events');
  if (!Array.isArray(data)) {
    throw new AppError('Unexpected FarmBot farm_events response', 502, 'FARMBOT_API_ERROR');
  }
  return data as Record<string, unknown>[];
};

export const fetchPeripherals = async (
  claims: FarmBotTokenClaims,
): Promise<Record<string, unknown>[]> => {
  const data = await farmBotFetch<unknown>(claims, '/peripherals');
  if (!Array.isArray(data)) {
    throw new AppError('Unexpected FarmBot peripherals response', 502, 'FARMBOT_API_ERROR');
  }
  return data as Record<string, unknown>[];
};

export const fetchTools = async (
  claims: FarmBotTokenClaims,
): Promise<Record<string, unknown>[]> => {
  const data = await farmBotFetch<unknown>(claims, '/tools');
  if (!Array.isArray(data)) {
    throw new AppError('Unexpected FarmBot tools response', 502, 'FARMBOT_API_ERROR');
  }
  return data as Record<string, unknown>[];
};

export const fetchImages = async (
  claims: FarmBotTokenClaims,
): Promise<Record<string, unknown>[]> => {
  const data = await farmBotFetch<unknown>(claims, '/images');
  if (!Array.isArray(data)) {
    throw new AppError('Unexpected FarmBot images response', 502, 'FARMBOT_API_ERROR');
  }
  return data as Record<string, unknown>[];
};

export const fetchLogs = async (
  claims: FarmBotTokenClaims,
): Promise<Record<string, unknown>[]> => {
  const data = await farmBotFetch<unknown>(claims, '/logs');
  if (!Array.isArray(data)) {
    throw new AppError('Unexpected FarmBot logs response', 502, 'FARMBOT_API_ERROR');
  }
  return data as Record<string, unknown>[];
};

export const createPoint = async (
  claims: FarmBotTokenClaims,
  input: FarmBotPlantPointInput,
): Promise<FarmBotPlantPoint> => {
  const body = {
    pointer_type: 'Plant',
    name: input.name,
    x: input.x,
    y: input.y,
    z: input.z ?? 0,
    radius: input.radius ?? 25,
    plant_stage: input.plant_stage || 'planned',
    planted_at: input.planted_at ?? null,
    openfarm_slug: input.openfarm_slug ?? null,
  };
  return farmBotFetch<FarmBotPlantPoint>(claims, '/points', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const updatePoint = async (
  claims: FarmBotTokenClaims,
  pointId: number | string,
  input: Partial<FarmBotPlantPointInput>,
): Promise<FarmBotPlantPoint> => {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.x !== undefined) body.x = input.x;
  if (input.y !== undefined) body.y = input.y;
  if (input.z !== undefined) body.z = input.z;
  if (input.radius !== undefined) body.radius = input.radius;
  if (input.plant_stage !== undefined) body.plant_stage = input.plant_stage;
  if (input.planted_at !== undefined) body.planted_at = input.planted_at;
  if (input.openfarm_slug !== undefined) body.openfarm_slug = input.openfarm_slug;
  return farmBotFetch<FarmBotPlantPoint>(claims, `/points/${pointId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

export const deletePoints = async (
  claims: FarmBotTokenClaims,
  pointId: number | string,
): Promise<void> => {
  await farmBotFetch<unknown>(claims, `/points/${pointId}`, { method: 'DELETE' });
};
