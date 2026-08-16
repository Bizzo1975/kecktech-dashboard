import { Response } from 'express';
import { Op } from 'sequelize';
import {
  createGardenSourceSchema,
  createGardenYieldEventSchema,
  harvestGardenYieldEventSchema,
  normalizeItemName,
  suggestCategoryAndAisle,
  updateGardenSourceSchema,
  updateGardenYieldEventSchema,
} from '@marketlist/shared';
import { AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import {
  GardenSource,
  GardenYieldEvent,
  HouseholdMember,
  PantryItem,
} from '../models';
import {
  parseFarmBotTokenInput,
  syncMappedYieldsFromClaims,
} from '../services/farmbot';
import {
  startFarmBotBrokerForSource,
  stopFarmBotBroker,
} from '../services/farmbotBroker';
import {
  startFarmBotControlForSource,
  stopFarmBotControl,
} from '../services/farmbotControl';
import { decryptSecret, encryptSecret } from '../services/tokenCrypto';
import { AppError, sendSuccess } from '../utils/http';

export const createSourceValidators = [validateBody(createGardenSourceSchema)];
export const updateSourceValidators = [validateBody(updateGardenSourceSchema)];
export const createYieldValidators = [validateBody(createGardenYieldEventSchema)];
export const updateYieldValidators = [validateBody(updateGardenYieldEventSchema)];
export const harvestValidators = [validateBody(harvestGardenYieldEventSchema)];

const assertHouseholdMember = async (userId: string, householdId: string) => {
  const member = await HouseholdMember.findOne({ where: { userId, householdId } });
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  return member;
};

const requireHouseholdId = (raw: unknown): string => {
  const householdId = raw ? String(raw) : '';
  if (!householdId) throw new AppError('householdId required', 400, 'VALIDATION_ERROR');
  return householdId;
};

const publicSource = (source: GardenSource) => {
  const json = source.toJSON() as Record<string, unknown>;
  delete json.farmbotApiToken;
  return {
    ...json,
    hasFarmbotToken: Boolean(source.farmbotApiToken),
  };
};

const upsertYieldFromFarmBot = async (
  source: GardenSource,
  mapped: {
    farmbotPlantId: string;
    plantName: string;
    status: 'planted' | 'growing' | 'ready' | 'harvested';
    expectedHarvestStart: string | null;
    expectedHarvestEnd: string | null;
  },
) => {
  const existing = await GardenYieldEvent.findOne({
    where: { gardenSourceId: source.id, farmbotPlantId: mapped.farmbotPlantId },
  });

  if (existing) {
    if (existing.status === 'harvested' && mapped.status !== 'harvested') {
      return existing;
    }
    const nextStatus =
      mapped.status === 'harvested'
        ? 'harvested'
        : existing.status === 'ready'
          ? 'ready'
          : mapped.status;
    await existing.update({
      plantName: mapped.plantName,
      status: nextStatus,
      expectedHarvestStart: mapped.expectedHarvestStart,
      expectedHarvestEnd: mapped.expectedHarvestEnd,
    });
    return existing;
  }

  if (mapped.status === 'harvested') return null;

  return GardenYieldEvent.create({
    householdId: source.householdId,
    gardenSourceId: source.id,
    plantName: mapped.plantName,
    expectedHarvestStart: mapped.expectedHarvestStart,
    expectedHarvestEnd: mapped.expectedHarvestEnd,
    estimatedYieldQty: null,
    estimatedYieldUnit: null,
    status: mapped.status,
    farmbotPlantId: mapped.farmbotPlantId,
    harvestedPantryItemId: null,
  });
};

export const listGardenSources = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = requireHouseholdId(req.query.householdId);
  await assertHouseholdMember(req.user.id, householdId);
  const sources = await GardenSource.findAll({
    where: { householdId },
    order: [['name', 'ASC']],
  });
  return sendSuccess(res, { sources: sources.map(publicSource) });
};

export const createGardenSource = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const body = req.body as {
    householdId: string;
    type: 'manual' | 'farmbot' | 'indoor_tray';
    name: string;
    farmbotDeviceId?: string | null;
    farmbotApiToken?: string | null;
  };
  await assertHouseholdMember(req.user.id, body.householdId);

  if (body.type === 'farmbot' && body.farmbotApiToken) {
    parseFarmBotTokenInput(body.farmbotApiToken);
  }

  const encrypted =
    body.type === 'farmbot' && body.farmbotApiToken
      ? encryptSecret(body.farmbotApiToken.trim())
      : null;

  const source = await GardenSource.create({
    householdId: body.householdId,
    type: body.type,
    name: body.name.trim(),
    farmbotDeviceId: body.type === 'farmbot' ? body.farmbotDeviceId || null : null,
    farmbotApiToken: encrypted,
    lastSyncedAt: null,
  });

  if (source.type === 'farmbot' && source.farmbotApiToken) {
    await startFarmBotBrokerForSource(source);
    await startFarmBotControlForSource(source);
  }

  return sendSuccess(res, { source: publicSource(source) }, 201);
};

export const updateGardenSource = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const source = await GardenSource.findByPk(String(req.params.id));
  if (!source) throw new AppError('Not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, source.householdId);

  const body = req.body as {
    type?: 'manual' | 'farmbot' | 'indoor_tray';
    name?: string;
    farmbotDeviceId?: string | null;
    farmbotApiToken?: string | null;
  };

  if (body.name !== undefined) source.name = body.name.trim();
  if (body.type !== undefined) source.type = body.type;
  if (body.farmbotDeviceId !== undefined) source.farmbotDeviceId = body.farmbotDeviceId;

  if (body.farmbotApiToken !== undefined) {
    if (body.farmbotApiToken === null || body.farmbotApiToken === '') {
      source.farmbotApiToken = null;
      stopFarmBotBroker(source.id);
      stopFarmBotControl(source.id);
    } else {
      parseFarmBotTokenInput(body.farmbotApiToken);
      source.farmbotApiToken = encryptSecret(body.farmbotApiToken.trim());
    }
  }

  if (source.type !== 'farmbot') {
    source.farmbotApiToken = null;
    source.farmbotDeviceId = null;
    stopFarmBotBroker(source.id);
    stopFarmBotControl(source.id);
  }

  await source.save();

  if (source.type === 'farmbot' && source.farmbotApiToken) {
    await startFarmBotBrokerForSource(source);
    await startFarmBotControlForSource(source);
  }

  return sendSuccess(res, { source: publicSource(source) });
};

export const deleteGardenSource = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const source = await GardenSource.findByPk(String(req.params.id));
  if (!source) throw new AppError('Not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, source.householdId);
  stopFarmBotBroker(source.id);
  stopFarmBotControl(source.id);
  await GardenYieldEvent.destroy({ where: { gardenSourceId: source.id } });
  await source.destroy();
  return sendSuccess(res, { message: 'Deleted' });
};

export const syncGardenSource = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const source = await GardenSource.findByPk(String(req.params.id));
  if (!source) throw new AppError('Not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, source.householdId);

  if (source.type !== 'farmbot') {
    throw new AppError('Only FarmBot sources can sync', 400, 'VALIDATION_ERROR');
  }
  if (!source.farmbotApiToken) {
    throw new AppError('Connect a FarmBot API token before syncing', 400, 'VALIDATION_ERROR');
  }

  const claims = parseFarmBotTokenInput(decryptSecret(source.farmbotApiToken));
  const mapped = await syncMappedYieldsFromClaims(claims);

  let upserted = 0;
  for (const row of mapped) {
    const result = await upsertYieldFromFarmBot(source, row);
    if (result) upserted += 1;
  }

  // Remove local FarmBot rows that vanished from the device (and are not harvested)
  const remoteIds = mapped.map((m) => m.farmbotPlantId);
  if (remoteIds.length) {
    await GardenYieldEvent.destroy({
      where: {
        gardenSourceId: source.id,
        farmbotPlantId: { [Op.notIn]: remoteIds, [Op.ne]: null },
        status: { [Op.ne]: 'harvested' },
      },
    });
  } else {
    await GardenYieldEvent.destroy({
      where: {
        gardenSourceId: source.id,
        farmbotPlantId: { [Op.ne]: null },
        status: { [Op.ne]: 'harvested' },
      },
    });
  }

  await source.update({ lastSyncedAt: new Date() });
  await startFarmBotBrokerForSource(source);
  await startFarmBotControlForSource(source);

  const yields = await GardenYieldEvent.findAll({
    where: { gardenSourceId: source.id },
    order: [['plantName', 'ASC']],
  });

  return sendSuccess(res, {
    source: publicSource(source),
    synced: upserted,
    yields,
  });
};

export const listGardenYields = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = requireHouseholdId(req.query.householdId);
  await assertHouseholdMember(req.user.id, householdId);
  const where: Record<string, unknown> = { householdId };
  if (req.query.gardenSourceId) where.gardenSourceId = String(req.query.gardenSourceId);
  if (req.query.status) where.status = String(req.query.status);
  const yields = await GardenYieldEvent.findAll({
    where,
    order: [
      ['status', 'ASC'],
      ['expectedHarvestStart', 'ASC'],
      ['plantName', 'ASC'],
    ],
  });
  return sendSuccess(res, { yields });
};

export const createGardenYield = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const body = req.body as {
    householdId: string;
    gardenSourceId: string;
    plantName: string;
    expectedHarvestStart?: string | null;
    expectedHarvestEnd?: string | null;
    estimatedYieldQty?: number | null;
    estimatedYieldUnit?: string | null;
    status?: 'planted' | 'growing' | 'ready' | 'harvested';
  };
  await assertHouseholdMember(req.user.id, body.householdId);
  const source = await GardenSource.findByPk(body.gardenSourceId);
  if (!source || source.householdId !== body.householdId) {
    throw new AppError('Garden source not found', 404, 'NOT_FOUND');
  }

  const yieldEvent = await GardenYieldEvent.create({
    householdId: body.householdId,
    gardenSourceId: body.gardenSourceId,
    plantName: body.plantName.trim(),
    expectedHarvestStart: body.expectedHarvestStart || null,
    expectedHarvestEnd: body.expectedHarvestEnd || null,
    estimatedYieldQty: body.estimatedYieldQty ?? null,
    estimatedYieldUnit: body.estimatedYieldUnit || null,
    status: body.status || 'planted',
    farmbotPlantId: null,
    harvestedPantryItemId: null,
  });
  return sendSuccess(res, { yield: yieldEvent }, 201);
};

export const updateGardenYield = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const yieldEvent = await GardenYieldEvent.findByPk(String(req.params.id));
  if (!yieldEvent) throw new AppError('Not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, yieldEvent.householdId);

  const body = req.body as {
    plantName?: string;
    expectedHarvestStart?: string | null;
    expectedHarvestEnd?: string | null;
    estimatedYieldQty?: number | null;
    estimatedYieldUnit?: string | null;
    status?: 'planted' | 'growing' | 'ready' | 'harvested';
  };

  if (body.plantName !== undefined) yieldEvent.plantName = body.plantName.trim();
  if (body.expectedHarvestStart !== undefined) {
    yieldEvent.expectedHarvestStart = body.expectedHarvestStart;
  }
  if (body.expectedHarvestEnd !== undefined) {
    yieldEvent.expectedHarvestEnd = body.expectedHarvestEnd;
  }
  if (body.estimatedYieldQty !== undefined) yieldEvent.estimatedYieldQty = body.estimatedYieldQty;
  if (body.estimatedYieldUnit !== undefined) {
    yieldEvent.estimatedYieldUnit = body.estimatedYieldUnit;
  }
  if (body.status !== undefined) yieldEvent.status = body.status;
  await yieldEvent.save();
  return sendSuccess(res, { yield: yieldEvent });
};

export const deleteGardenYield = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const yieldEvent = await GardenYieldEvent.findByPk(String(req.params.id));
  if (!yieldEvent) throw new AppError('Not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, yieldEvent.householdId);
  await yieldEvent.destroy();
  return sendSuccess(res, { message: 'Deleted' });
};

export const harvestGardenYield = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const yieldEvent = await GardenYieldEvent.findByPk(String(req.params.id));
  if (!yieldEvent) throw new AppError('Not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, yieldEvent.householdId);

  if (yieldEvent.status === 'harvested' && yieldEvent.harvestedPantryItemId) {
    const existing = await PantryItem.findByPk(yieldEvent.harvestedPantryItemId);
    return sendSuccess(res, { yield: yieldEvent, pantryItem: existing });
  }

  const body = req.body as {
    quantity?: number;
    unit?: string;
    expiryDate?: string | null;
  };

  const qty =
    body.quantity ??
    (yieldEvent.estimatedYieldQty && yieldEvent.estimatedYieldQty > 0
      ? yieldEvent.estimatedYieldQty
      : 1);
  const unit = body.unit || yieldEvent.estimatedYieldUnit || null;
  const { category } = suggestCategoryAndAisle(yieldEvent.plantName);
  const canonical = normalizeItemName(yieldEvent.plantName);

  let pantryItem = await PantryItem.findOne({
    where: { householdId: yieldEvent.householdId, name: { [Op.iLike]: canonical } },
  });

  if (pantryItem) {
    await pantryItem.update({
      quantity: Number(pantryItem.quantity) + Number(qty),
      unit: unit || pantryItem.unit,
      expiryDate: body.expiryDate !== undefined ? body.expiryDate : pantryItem.expiryDate,
      category: pantryItem.category || category,
    });
  } else {
    pantryItem = await PantryItem.create({
      householdId: yieldEvent.householdId,
      name: yieldEvent.plantName.trim(),
      category,
      quantity: qty,
      unit,
      expiryDate: body.expiryDate || null,
      lowStockThreshold: null,
      gtin: null,
    });
  }

  await yieldEvent.update({
    status: 'harvested',
    harvestedPantryItemId: pantryItem.id,
    estimatedYieldQty: qty,
    estimatedYieldUnit: unit,
  });

  return sendSuccess(res, { yield: yieldEvent, pantryItem });
};
