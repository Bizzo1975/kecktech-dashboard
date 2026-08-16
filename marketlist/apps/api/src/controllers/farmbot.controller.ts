import { Response } from 'express';
import {
  createFarmbotPlantPointSchema,
  farmbotConfirmSchema,
  farmbotHomeSchema,
  farmbotMoveSchema,
  updateFarmbotPlantPointSchema,
} from '@marketlist/shared';
import { AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { GardenSource, HouseholdMember } from '../models';
import {
  createPoint,
  deletePoints,
  fetchDevice,
  fetchFarmEvents,
  fetchImages,
  fetchLogs,
  fetchPeripherals,
  fetchRegimens,
  fetchSequences,
  fetchTools,
  parseFarmBotTokenInput,
  updatePoint,
} from '../services/farmbot';
import {
  emergencyLock,
  emergencyUnlock,
  execSequence,
  findHome,
  getFarmBotCachedStatus,
  home,
  moveAbsolute,
  readStatus,
  requestSync,
  takePhoto,
  togglePin,
} from '../services/farmbotControl';
import { decryptSecret } from '../services/tokenCrypto';
import { AppError, sendSuccess } from '../utils/http';

export const confirmValidators = [validateBody(farmbotConfirmSchema)];
export const homeValidators = [validateBody(farmbotHomeSchema)];
export const moveValidators = [validateBody(farmbotMoveSchema)];
export const createPointValidators = [validateBody(createFarmbotPlantPointSchema)];
export const updatePointValidators = [validateBody(updateFarmbotPlantPointSchema)];

const assertHouseholdMember = async (userId: string, householdId: string) => {
  const member = await HouseholdMember.findOne({ where: { userId, householdId } });
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  return member;
};

const loadFarmBotSource = async (userId: string, sourceId: string) => {
  const source = await GardenSource.findByPk(sourceId);
  if (!source) throw new AppError('Garden source not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(userId, source.householdId);
  if (source.type !== 'farmbot') {
    throw new AppError('Garden source is not a FarmBot connection', 400, 'VALIDATION_ERROR');
  }
  if (!source.farmbotApiToken) {
    throw new AppError('FarmBot API token not configured', 400, 'VALIDATION_ERROR');
  }
  const claims = parseFarmBotTokenInput(decryptSecret(source.farmbotApiToken));
  return { source, claims };
};

const requireConfirm = (body: unknown) => {
  const parsed = farmbotConfirmSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('confirm: true is required for this action', 400, 'VALIDATION_ERROR');
  }
};

export const getFarmBotStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { source } = await loadFarmBotSource(req.user.id, req.params.id);
  const cached = getFarmBotCachedStatus(source.id);
  // Best-effort refresh without blocking the poll response on MQTT RPC timeout
  if (cached.mqttConnected && !cached.lastStatus) {
    void readStatus(source.id).catch(() => undefined);
  }
  const status = cached.lastStatus as Record<string, unknown> | null;
  const location = (status?.location_data as Record<string, unknown> | undefined)?.position as
    | Record<string, unknown>
    | undefined;
  const informatics = status?.informational_settings as Record<string, unknown> | undefined;
  return sendSuccess(res, {
    sourceId: source.id,
    mqttConnected: cached.mqttConnected,
    lastStatusAt: cached.lastStatusAt,
    locked: Boolean(informatics?.locked),
    busy: Boolean(informatics?.busy),
    syncStatus: informatics?.sync_status ?? null,
    position: location
      ? { x: location.x ?? null, y: location.y ?? null, z: location.z ?? null }
      : null,
    raw: cached.lastStatus,
    recentLogs: cached.recentLogs,
  });
};

export const getFarmBotDevice = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const device = await fetchDevice(claims);
  return sendSuccess(res, { device });
};

export const listFarmBotSequences = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const sequences = await fetchSequences(claims);
  return sendSuccess(res, {
    sequences: sequences.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color ?? null,
      folder_id: s.folder_id ?? null,
    })),
  });
};

export const execFarmBotSequence = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  requireConfirm(req.body);
  const { source } = await loadFarmBotSource(req.user.id, req.params.id);
  const sequenceId = Number(req.params.sequenceId);
  if (!Number.isFinite(sequenceId)) {
    throw new AppError('Invalid sequence id', 400, 'VALIDATION_ERROR');
  }
  const result = await execSequence(source.id, sequenceId);
  return sendSuccess(res, { ok: true, result });
};

export const listFarmBotRegimens = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const regimens = await fetchRegimens(claims);
  return sendSuccess(res, { regimens });
};

export const listFarmBotFarmEvents = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const farmEvents = await fetchFarmEvents(claims);
  return sendSuccess(res, { farmEvents });
};

export const listFarmBotPeripherals = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const peripherals = await fetchPeripherals(claims);
  return sendSuccess(res, { peripherals });
};

export const toggleFarmBotPeripheral = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  requireConfirm(req.body);
  const { source, claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const pinId = Number(req.params.pinId);
  if (!Number.isFinite(pinId)) {
    throw new AppError('Invalid peripheral pin id', 400, 'VALIDATION_ERROR');
  }
  const peripherals = await fetchPeripherals(claims);
  const peripheral = peripherals.find((p) => Number(p.id) === pinId || Number(p.pin) === pinId);
  const pinNumber = peripheral ? Number(peripheral.pin) : pinId;
  if (!Number.isFinite(pinNumber)) {
    throw new AppError('Peripheral pin not found', 404, 'NOT_FOUND');
  }
  const result = await togglePin(source.id, pinNumber);
  return sendSuccess(res, { ok: true, pin: pinNumber, result });
};

export const listFarmBotTools = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const tools = await fetchTools(claims);
  return sendSuccess(res, { tools });
};

export const listFarmBotImages = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const images = await fetchImages(claims);
  return sendSuccess(res, { images });
};

export const takeFarmBotPhoto = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  requireConfirm(req.body);
  const { source } = await loadFarmBotSource(req.user.id, req.params.id);
  const result = await takePhoto(source.id);
  return sendSuccess(res, { ok: true, result });
};

export const listFarmBotLogs = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { source, claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const cached = getFarmBotCachedStatus(source.id);
  let history: Record<string, unknown>[] = [];
  try {
    history = await fetchLogs(claims);
  } catch {
    history = [];
  }
  return sendSuccess(res, {
    recentLogs: cached.recentLogs,
    logs: history.slice(0, 100),
  });
};

export const farmBotEstop = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  requireConfirm(req.body);
  const { source } = await loadFarmBotSource(req.user.id, req.params.id);
  const result = await emergencyLock(source.id);
  return sendSuccess(res, { ok: true, result });
};

export const farmBotUnlock = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  requireConfirm(req.body);
  const { source } = await loadFarmBotSource(req.user.id, req.params.id);
  const result = await emergencyUnlock(source.id);
  return sendSuccess(res, { ok: true, result });
};

export const farmBotHome = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const body = req.body as { confirm: true; axis?: 'all' | 'x' | 'y' | 'z'; findHome?: boolean };
  requireConfirm(body);
  const { source } = await loadFarmBotSource(req.user.id, req.params.id);
  const axis = body.axis || 'all';
  const result = body.findHome
    ? await findHome(source.id, axis)
    : await home(source.id, axis);
  return sendSuccess(res, { ok: true, result });
};

export const farmBotMove = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const body = req.body as {
    confirm: true;
    x: number;
    y: number;
    z: number;
    speed?: number;
  };
  requireConfirm(body);
  const { source } = await loadFarmBotSource(req.user.id, req.params.id);
  const result = await moveAbsolute(source.id, {
    x: body.x,
    y: body.y,
    z: body.z,
    speed: body.speed,
  });
  return sendSuccess(res, { ok: true, result });
};

export const farmBotDeviceSync = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  requireConfirm(req.body);
  const { source } = await loadFarmBotSource(req.user.id, req.params.id);
  const result = await requestSync(source.id);
  return sendSuccess(res, { ok: true, result });
};

export const createFarmBotPoint = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const body = req.body as {
    name: string;
    x: number;
    y: number;
    z?: number;
    radius?: number;
    plant_stage?: string;
    planted_at?: string | null;
    openfarm_slug?: string | null;
  };
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const point = await createPoint(claims, {
    name: body.name,
    x: body.x,
    y: body.y,
    z: body.z,
    radius: body.radius,
    plant_stage: body.plant_stage,
    planted_at: body.planted_at,
    openfarm_slug: body.openfarm_slug,
  });
  return sendSuccess(res, { point }, 201);
};

export const updateFarmBotPoint = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  const point = await updatePoint(claims, req.params.pointId, req.body);
  return sendSuccess(res, { point });
};

export const deleteFarmBotPoint = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { claims } = await loadFarmBotSource(req.user.id, req.params.id);
  await deletePoints(claims, req.params.pointId);
  return sendSuccess(res, { ok: true });
};
