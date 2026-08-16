import crypto from 'crypto';
import { Response } from 'express';
import { createHouseholdSchema, joinHouseholdSchema, updateHouseholdSchema } from '@marketlist/shared';
import {
  GroceryList,
  Household,
  HouseholdMember,
  ItemMemory,
  ListItem,
  PantryItem,
  PriceHistory,
  Store,
  User,
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { AppError, sendSuccess } from '../utils/http';

export const createHouseholdValidators = [validateBody(createHouseholdSchema)];
export const joinHouseholdValidators = [validateBody(joinHouseholdSchema)];
export const updateHouseholdValidators = [validateBody(updateHouseholdSchema)];

const makeInviteCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

const assertMembership = async (userId: string, householdId: string) => {
  const member = await HouseholdMember.findOne({ where: { userId, householdId } });
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  return member;
};

const cascadeDeleteHousehold = async (householdId: string) => {
  const lists = await GroceryList.findAll({ where: { householdId } });
  const listIds = lists.map((l) => l.id);
  if (listIds.length) {
    await ListItem.destroy({ where: { listId: listIds } });
    await GroceryList.destroy({ where: { id: listIds } });
  }
  await PantryItem.destroy({ where: { householdId } });
  await ItemMemory.destroy({ where: { householdId } });
  await PriceHistory.destroy({ where: { householdId } });
  await Store.destroy({ where: { householdId } });
  const { GardenSource, GardenYieldEvent } = await import('../models');
  const { stopFarmBotBroker } = await import('../services/farmbotBroker');
  const { stopFarmBotControl } = await import('../services/farmbotControl');
  const gardenSources = await GardenSource.findAll({ where: { householdId } });
  for (const source of gardenSources) {
    stopFarmBotBroker(source.id);
    stopFarmBotControl(source.id);
  }
  await GardenYieldEvent.destroy({ where: { householdId } });
  await GardenSource.destroy({ where: { householdId } });
  await HouseholdMember.destroy({ where: { householdId } });
  await Household.destroy({ where: { id: householdId } });
};

/** Remove a user from a household; delete household if empty; promote owner if needed. */
export const leaveHouseholdInternal = async (userId: string, householdId: string) => {
  const member = await HouseholdMember.findOne({ where: { userId, householdId } });
  if (!member) return { left: false as const, deletedHousehold: false };

  const allMembers = await HouseholdMember.findAll({ where: { householdId } });
  await member.destroy();
  const remaining = allMembers.filter((m) => m.userId !== userId);

  if (remaining.length === 0) {
    await cascadeDeleteHousehold(householdId);
    return { left: true as const, deletedHousehold: true };
  }

  if (member.role === 'owner') {
    const nextOwner = remaining.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )[0];
    await nextOwner.update({ role: 'owner' });
  }

  return { left: true as const, deletedHousehold: false };
};

export const createHousehold = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const household = await Household.create({
    name: req.body.name,
    inviteCode: makeInviteCode(),
  });
  await HouseholdMember.create({
    householdId: household.id,
    userId: req.user.id,
    role: 'owner',
  });
  const list = await GroceryList.create({
    householdId: household.id,
    name: 'Weekly run',
    type: 'shopping',
    sortMode: 'aisle',
  });
  return sendSuccess(res, { household, list }, 201);
};

export const bootstrapHousehold = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.params.id);
  const member = await HouseholdMember.findOne({
    where: { householdId, userId: req.user.id },
  });
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  const existing = await GroceryList.findAll({
    where: { householdId },
    order: [['createdAt', 'ASC']],
  });
  if (existing.length > 0) {
    return sendSuccess(res, { list: existing[0], created: false });
  }
  const list = await GroceryList.create({
    householdId,
    name: 'Weekly run',
    type: 'shopping',
    sortMode: 'aisle',
  });
  return sendSuccess(res, { list, created: true }, 201);
};

export const joinHousehold = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const household = await Household.findOne({
    where: { inviteCode: String(req.body.inviteCode).toUpperCase() },
  });
  if (!household) throw new AppError('Invalid invite code', 404, 'NOT_FOUND');
  const existing = await HouseholdMember.findOne({
    where: { householdId: household.id, userId: req.user.id },
  });
  if (!existing) {
    await HouseholdMember.create({
      householdId: household.id,
      userId: req.user.id,
      role: 'member',
    });
  }
  const io = req.app.get('io');
  io?.to(`household:${household.id}`).emit('member:joined', { userId: req.user.id });
  return sendSuccess(res, { household });
};

export const listHouseholds = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const memberships = await HouseholdMember.findAll({
    where: { userId: req.user.id },
  });
  const householdIds = memberships.map((m) => m.householdId);
  const households = householdIds.length
    ? await Household.findAll({ where: { id: householdIds } })
    : [];
  return sendSuccess(res, { households });
};

export const listMembers = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.params.id);
  await assertMembership(req.user.id, householdId);
  const rows = await HouseholdMember.findAll({
    where: { householdId },
    include: [{ model: User, attributes: ['id', 'email', 'name'] }],
    order: [['createdAt', 'ASC']],
  });
  const members = rows.map((row) => {
    const user = (row as HouseholdMember & { User?: User }).User;
    return {
      id: user?.id || row.userId,
      email: user?.email || '',
      name: user?.name || '',
      role: row.role,
    };
  });
  return sendSuccess(res, { members });
};

export const updateHousehold = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.params.id);
  await assertMembership(req.user.id, householdId);
  const household = await Household.findByPk(householdId);
  if (!household) throw new AppError('Household not found', 404, 'NOT_FOUND');
  await household.update(req.body);
  return sendSuccess(res, { household });
};

export const leaveHousehold = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.params.id);
  const member = await HouseholdMember.findOne({
    where: { householdId, userId: req.user.id },
  });
  if (!member) throw new AppError('Not a member of this household', 404, 'NOT_FOUND');
  const result = await leaveHouseholdInternal(req.user.id, householdId);
  const io = req.app.get('io');
  io?.to(`household:${householdId}`).emit('member:left', {
    userId: req.user.id,
    deletedHousehold: result.deletedHousehold,
  });
  return sendSuccess(res, {
    message: 'Left household',
    deletedHousehold: result.deletedHousehold,
  });
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.params.id);
  const targetUserId = String(req.params.userId);
  const actor = await assertMembership(req.user.id, householdId);
  if (actor.role !== 'owner') throw new AppError('Only the owner can remove members', 403, 'FORBIDDEN');
  if (targetUserId === req.user.id) {
    throw new AppError('Use leave to remove yourself', 400, 'VALIDATION_ERROR');
  }
  const target = await HouseholdMember.findOne({
    where: { householdId, userId: targetUserId },
  });
  if (!target) throw new AppError('Member not found', 404, 'NOT_FOUND');
  await target.destroy();
  const io = req.app.get('io');
  io?.to(`household:${householdId}`).emit('member:left', {
    userId: targetUserId,
    removedBy: req.user.id,
  });
  return sendSuccess(res, { message: 'Member removed' });
};
