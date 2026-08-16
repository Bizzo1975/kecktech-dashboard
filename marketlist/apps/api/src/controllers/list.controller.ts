import { Response } from 'express';
import { Op } from 'sequelize';
import {
  addPantryToListSchema,
  aisleSortIndex,
  completeTripSchema,
  copyListSchema,
  createListItemSchema,
  createListSchema,
  createPantryItemSchema,
  normalizeItemName,
  suggestCategoryAndAisle,
  updateListItemSchema,
  updateListSchema,
  updatePantryItemSchema,
} from '@marketlist/shared';
import {
  CatalogItem,
  GroceryList,
  HouseholdMember,
  ItemMemory,
  ListItem,
  PantryItem,
  PriceHistory,
  Store,
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { AppError, sendSuccess } from '../utils/http';

export const createListValidators = [validateBody(createListSchema)];
export const updateListValidators = [validateBody(updateListSchema)];
export const copyListValidators = [validateBody(copyListSchema)];
export const createItemValidators = [validateBody(createListItemSchema)];
export const updateItemValidators = [validateBody(updateListItemSchema)];
export const createPantryValidators = [validateBody(createPantryItemSchema)];
export const updatePantryValidators = [validateBody(updatePantryItemSchema)];
export const addToListValidators = [validateBody(addPantryToListSchema)];
export const completeTripValidators = [validateBody(completeTripSchema)];

const assertHouseholdMember = async (userId: string, householdId: string) => {
  const member = await HouseholdMember.findOne({ where: { userId, householdId } });
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  return member;
};

const assertAssigneeMembership = async (
  householdId: string,
  assigneeUserId: string | null | undefined,
) => {
  if (assigneeUserId === undefined || assigneeUserId === null) return;
  const member = await HouseholdMember.findOne({
    where: { householdId, userId: assigneeUserId },
  });
  if (!member) {
    throw new AppError('Assignee must be a household member', 400, 'VALIDATION_ERROR');
  }
};

const emitHousehold = (req: AuthRequest, householdId: string, event: string, payload: unknown) => {
  const io = req.app.get('io');
  io?.to(`household:${householdId}`).emit(event, payload);
};

const sortListItems = (items: ListItem[], sortMode: GroceryList['sortMode']): ListItem[] => {
  const copy = [...items];
  if (sortMode === 'aisle') {
    copy.sort((a, b) => {
      const ai = aisleSortIndex(a.aisleSection || 'Other');
      const bi = aisleSortIndex(b.aisleSection || 'Other');
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }
  if (sortMode === 'category') {
    copy.sort((a, b) => {
      const c = (a.category || '').localeCompare(b.category || '');
      if (c !== 0) return c;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }
  copy.sort((a, b) => {
    const ao = a.sortOrder;
    const bo = b.sortOrder;
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    if (ao != null && bo == null) return -1;
    if (ao == null && bo != null) return 1;
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return at - bt;
  });
  return copy;
};

const withSortedItems = (list: GroceryList) => {
  const plain = list.toJSON() as ReturnType<GroceryList['toJSON']> & { items?: ListItem[] };
  const items = (list as GroceryList & { items?: ListItem[] }).items || [];
  plain.items = sortListItems(items, list.sortMode);
  return plain;
};

const rememberItem = async (input: {
  householdId: string;
  name: string;
  category?: string | null;
  aisleSection?: string | null;
  quantity?: number;
  unit?: string | null;
}) => {
  const canonicalName = normalizeItemName(input.name);
  const existing = await ItemMemory.findOne({
    where: { householdId: input.householdId, canonicalName },
  });
  if (existing) {
    await existing.update({
      displayName: input.name.trim(),
      category: input.category || existing.category,
      aisleSection: input.aisleSection || existing.aisleSection,
      lastQuantity: input.quantity ?? existing.lastQuantity,
      lastUnit: input.unit ?? existing.lastUnit,
      useCount: existing.useCount + 1,
      lastUsedAt: new Date(),
    });
    return existing;
  }
  return ItemMemory.create({
    householdId: input.householdId,
    canonicalName,
    displayName: input.name.trim(),
    category: input.category || null,
    aisleSection: input.aisleSection || null,
    lastQuantity: input.quantity ?? 1,
    lastUnit: input.unit ?? null,
    useCount: 1,
    lastUsedAt: new Date(),
  });
};

export const listLists = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.query.householdId || '');
  if (!householdId) throw new AppError('householdId required', 400, 'VALIDATION_ERROR');
  await assertHouseholdMember(req.user.id, householdId);
  const lists = await GroceryList.findAll({
    where: { householdId },
    include: [{ model: ListItem, as: 'items' }],
    order: [['updatedAt', 'DESC']],
  });
  return sendSuccess(res, {
    lists: lists.map((list) => withSortedItems(list)),
  });
};

export const createList = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  await assertHouseholdMember(req.user.id, req.body.householdId);
  const list = await GroceryList.create(req.body);
  emitHousehold(req, list.householdId, 'list:updated', { listId: list.id });
  return sendSuccess(res, { list }, 201);
};

export const getList = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const list = await GroceryList.findByPk(req.params.id, {
    include: [{ model: ListItem, as: 'items' }],
  });
  if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, list.householdId);
  return sendSuccess(res, { list: withSortedItems(list) });
};

export const updateList = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const list = await GroceryList.findByPk(req.params.id);
  if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, list.householdId);
  await list.update(req.body);
  emitHousehold(req, list.householdId, 'list:updated', { listId: list.id });
  return sendSuccess(res, { list });
};

export const deleteList = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const list = await GroceryList.findByPk(req.params.id);
  if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, list.householdId);
  const householdId = list.householdId;
  await ListItem.destroy({ where: { listId: list.id } });
  await list.destroy();
  emitHousehold(req, householdId, 'list:updated', { listId: req.params.id, deleted: true });
  return sendSuccess(res, { message: 'Deleted' });
};

export const copyList = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const source = await GroceryList.findByPk(req.params.id, {
    include: [{ model: ListItem, as: 'items' }],
  });
  if (!source) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, source.householdId);

  const requestedType = (req.body.type as 'shopping' | 'template' | undefined) || 'shopping';
  const name =
    typeof req.body.name === 'string' && req.body.name.trim()
      ? req.body.name.trim()
      : requestedType === 'template'
        ? `${source.name} template`
        : `${source.name} copy`;

  const list = await GroceryList.create({
    householdId: source.householdId,
    name,
    sortMode: source.sortMode,
    type: requestedType,
  });

  const items = (source.get('items') as ListItem[] | undefined) || [];
  if (items.length) {
    await ListItem.bulkCreate(
      items.map((item, index) => ({
        listId: list.id,
        name: item.name,
        category: item.category,
        aisleSection: item.aisleSection,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        checked: false,
        checkedAt: null,
        createdBy: req.user!.id,
        assigneeUserId: null,
        sortOrder: item.sortOrder ?? index,
      })),
    );
  }

  const full = await GroceryList.findByPk(list.id, {
    include: [{ model: ListItem, as: 'items' }],
  });
  emitHousehold(req, list.householdId, 'list:updated', { listId: list.id });
  return sendSuccess(res, { list: withSortedItems(full!) }, 201);
};

export const suggestItems = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.query.householdId || '');
  const q = String(req.query.q || '').trim();
  if (!householdId) throw new AppError('householdId required', 400, 'VALIDATION_ERROR');
  await assertHouseholdMember(req.user.id, householdId);

  const memory = await ItemMemory.findAll({
    where: {
      householdId,
      ...(q
        ? {
            [Op.or]: [
              { displayName: { [Op.iLike]: `%${q}%` } },
              { canonicalName: { [Op.iLike]: `%${q}%` } },
            ],
          }
        : {}),
    },
    order: [
      ['useCount', 'DESC'],
      ['lastUsedAt', 'DESC'],
    ],
    limit: 12,
  });

  const pantry = await PantryItem.findAll({
    where: {
      householdId,
      ...(q ? { name: { [Op.iLike]: `%${q}%` } } : {}),
    },
    limit: 8,
  });

  const catalog = await CatalogItem.findAll({
    where: q ? { name: { [Op.iLike]: `%${q}%` } } : {},
    limit: 8,
  });

  const seen = new Set<string>();
  const suggestions: Array<{
    name: string;
    source: 'memory' | 'pantry' | 'catalog';
    category: string | null;
    aisleSection: string | null;
    quantity: number;
    unit: string | null;
  }> = [];

  const push = (entry: (typeof suggestions)[number]) => {
    const key = normalizeItemName(entry.name);
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(entry);
  };

  for (const m of memory) {
    push({
      name: m.displayName,
      source: 'memory',
      category: m.category,
      aisleSection: m.aisleSection,
      quantity: m.lastQuantity,
      unit: m.lastUnit,
    });
  }
  for (const p of pantry) {
    const suggested = suggestCategoryAndAisle(p.name);
    push({
      name: p.name,
      source: 'pantry',
      category: p.category || suggested.category,
      aisleSection: suggested.aisleSection,
      quantity: 1,
      unit: p.unit,
    });
  }
  for (const c of catalog) {
    const suggested = suggestCategoryAndAisle(c.name);
    push({
      name: c.name,
      source: 'catalog',
      category: c.category || suggested.category,
      aisleSection: suggested.aisleSection,
      quantity: 1,
      unit: null,
    });
  }

  return sendSuccess(res, { suggestions: suggestions.slice(0, 16) });
};

export const addListItem = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const list = await GroceryList.findByPk(req.params.id);
  if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, list.householdId);

  if (req.body.assigneeUserId !== undefined) {
    await assertAssigneeMembership(list.householdId, req.body.assigneeUserId);
  }

  const canonical = normalizeItemName(req.body.name);
  const unchecked = await ListItem.findAll({ where: { listId: list.id, checked: false } });
  const duplicate = unchecked.find((row) => normalizeItemName(row.name) === canonical);
  if (duplicate) {
    const addQty = req.body.quantity ?? 1;
    const updates: {
      quantity: number;
      unit?: string | null;
      notes?: string | null;
      category?: string;
      aisleSection?: string;
    } = {
      quantity: Number(duplicate.quantity) + Number(addQty),
    };
    if (req.body.unit !== undefined) updates.unit = req.body.unit;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.category) updates.category = req.body.category;
    if (req.body.aisleSection) updates.aisleSection = req.body.aisleSection;
    await duplicate.update(updates);
    await rememberItem({
      householdId: list.householdId,
      name: duplicate.name,
      category: duplicate.category,
      aisleSection: duplicate.aisleSection,
      quantity: duplicate.quantity,
      unit: duplicate.unit,
    });
    emitHousehold(req, list.householdId, 'item:updated', { listId: list.id, item: duplicate, merged: true });
    return sendSuccess(res, { item: duplicate, merged: true });
  }

  const memory = await ItemMemory.findOne({
    where: { householdId: list.householdId, canonicalName: canonical },
  });
  const suggested = suggestCategoryAndAisle(req.body.name);

  let sortOrder: number | null = req.body.sortOrder ?? null;
  if (sortOrder == null && list.sortMode === 'custom') {
    const maxOrder = await ListItem.max('sortOrder', { where: { listId: list.id } });
    sortOrder = (typeof maxOrder === 'number' ? maxOrder : 0) + 1;
  }

  const item = await ListItem.create({
    listId: list.id,
    name: req.body.name,
    category: req.body.category || memory?.category || suggested.category,
    aisleSection: req.body.aisleSection || memory?.aisleSection || suggested.aisleSection,
    quantity: req.body.quantity ?? memory?.lastQuantity ?? 1,
    unit: req.body.unit ?? memory?.lastUnit ?? null,
    notes: req.body.notes ?? null,
    sortOrder,
    createdBy: req.user.id,
    assigneeUserId: req.body.assigneeUserId ?? null,
  });
  await rememberItem({
    householdId: list.householdId,
    name: item.name,
    category: item.category,
    aisleSection: item.aisleSection,
    quantity: item.quantity,
    unit: item.unit,
  });
  emitHousehold(req, list.householdId, 'item:updated', { listId: list.id, item });
  return sendSuccess(res, { item, merged: false }, 201);
};

export const updateListItem = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const list = await GroceryList.findByPk(req.params.listId);
  if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, list.householdId);
  const item = await ListItem.findOne({ where: { id: req.params.itemId, listId: list.id } });
  if (!item) throw new AppError('Item not found', 404, 'NOT_FOUND');
  if (req.body.assigneeUserId !== undefined) {
    await assertAssigneeMembership(list.householdId, req.body.assigneeUserId);
  }
  const updates = { ...req.body };
  if (typeof updates.checked === 'boolean') {
    updates.checkedAt = updates.checked ? new Date() : null;
  }
  await item.update(updates);
  if (
    updates.name ||
    updates.aisleSection ||
    updates.quantity ||
    updates.unit ||
    updates.category ||
    updates.notes !== undefined ||
    updates.assigneeUserId !== undefined
  ) {
    await rememberItem({
      householdId: list.householdId,
      name: item.name,
      category: item.category,
      aisleSection: item.aisleSection,
      quantity: item.quantity,
      unit: item.unit,
    });
  }
  emitHousehold(req, list.householdId, 'item:updated', { listId: list.id, item });
  return sendSuccess(res, { item });
};

export const deleteListItem = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const list = await GroceryList.findByPk(req.params.listId);
  if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, list.householdId);
  const item = await ListItem.findOne({ where: { id: req.params.itemId, listId: list.id } });
  if (!item) throw new AppError('Item not found', 404, 'NOT_FOUND');
  await item.destroy();
  emitHousehold(req, list.householdId, 'item:updated', {
    listId: list.id,
    itemId: req.params.itemId,
    deleted: true,
  });
  return sendSuccess(res, { message: 'Deleted' });
};

export const completeTrip = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const list = await GroceryList.findByPk(req.params.id, {
    include: [{ model: ListItem, as: 'items' }],
  });
  if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, list.householdId);
  const items = ((list as GroceryList & { items?: ListItem[] }).items || []) as ListItem[];
  const checked = items.filter((i) => i.checked);
  const remaining = items.filter((i) => !i.checked);
  const pantryUpserts: PantryItem[] = [];

  const storeId =
    typeof req.body.storeId === 'string' && req.body.storeId.trim() ? req.body.storeId.trim() : null;
  if (storeId) {
    const store = await Store.findByPk(storeId);
    if (!store) throw new AppError('Store not found', 404, 'NOT_FOUND');
    if (store.householdId && store.householdId !== list.householdId) {
      throw new AppError('Store does not belong to this household', 403, 'FORBIDDEN');
    }
  }

  if (req.body.addCheckedToPantry !== false) {
    for (const item of checked) {
      const existing = await PantryItem.findOne({
        where: {
          householdId: list.householdId,
          name: { [Op.iLike]: item.name },
        },
      });
      if (existing) {
        await existing.update({
          quantity: existing.quantity + (item.quantity || 1),
          unit: item.unit || existing.unit,
          category: item.category || existing.category,
        });
        pantryUpserts.push(existing);
      } else {
        const created = await PantryItem.create({
          householdId: list.householdId,
          name: item.name,
          category: item.category,
          quantity: item.quantity || 1,
          unit: item.unit,
          expiryDate: null,
          lowStockThreshold: null,
        });
        pantryUpserts.push(created);
      }
      await rememberItem({
        householdId: list.householdId,
        name: item.name,
        category: item.category,
        aisleSection: item.aisleSection,
        quantity: item.quantity,
        unit: item.unit,
      });
    }
  }

  const priceEntries: PriceHistory[] = [];
  const recordPricesFromMemory = req.body.recordPricesFromMemory !== false;
  if (storeId && recordPricesFromMemory) {
    for (const item of checked) {
      const prior = await PriceHistory.findOne({
        where: {
          householdId: list.householdId,
          itemName: { [Op.iLike]: item.name },
        },
        order: [['recordedAt', 'DESC']],
      });
      if (!prior) continue;
      const entry = await PriceHistory.create({
        itemName: item.name,
        storeId,
        price: prior.price,
        recordedAt: new Date(),
        householdId: list.householdId,
        category: item.category || prior.category || null,
        gtin: prior.gtin || null,
      });
      priceEntries.push(entry);
    }
  }

  // Checked items remain checked so the client can show a post-trip sheet before soft-clear.
  emitHousehold(req, list.householdId, 'list:updated', {
    listId: list.id,
    completed: true,
    storeId,
  });
  emitHousehold(req, list.householdId, 'pantry:updated', { tripComplete: true });
  return sendSuccess(res, {
    checkedCount: checked.length,
    remainingCount: remaining.length,
    pantryCount: pantryUpserts.length,
    pricesRecorded: priceEntries.length,
    storeId,
    remaining: remaining.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity })),
    pantryUpserts: pantryUpserts.map((p) => ({ id: p.id, name: p.name, quantity: p.quantity })),
  });
};

export const estimateListBasket = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const list = await GroceryList.findByPk(req.params.id, {
    include: [{ model: ListItem, as: 'items' }],
  });
  if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, list.householdId);
  const items = ((list as GroceryList & { items?: ListItem[] }).items || []) as ListItem[];
  const lines: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unitPrice: number | null;
    lineTotal: number | null;
    source: 'price_history' | 'unknown';
  }> = [];
  let estimatedTotal = 0;
  let pricedCount = 0;
  for (const item of items) {
    const prior = await PriceHistory.findOne({
      where: {
        householdId: list.householdId,
        itemName: { [Op.iLike]: item.name },
      },
      order: [['recordedAt', 'DESC']],
    });
    const qty = item.quantity || 1;
    if (prior) {
      const unitPrice = Number(prior.price);
      const lineTotal = Math.round(unitPrice * qty * 100) / 100;
      estimatedTotal += lineTotal;
      pricedCount += 1;
      lines.push({
        itemId: item.id,
        name: item.name,
        quantity: qty,
        unitPrice,
        lineTotal,
        source: 'price_history',
      });
    } else {
      lines.push({
        itemId: item.id,
        name: item.name,
        quantity: qty,
        unitPrice: null,
        lineTotal: null,
        source: 'unknown',
      });
    }
  }
  return sendSuccess(res, {
    listId: list.id,
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    pricedCount,
    unknownCount: items.length - pricedCount,
    lines,
    note: 'Estimate uses your household PriceHistory only — never invented prices.',
  });
};

export const listPantry = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.query.householdId || '');
  if (!householdId) throw new AppError('householdId required', 400, 'VALIDATION_ERROR');
  await assertHouseholdMember(req.user.id, householdId);
  const where: Record<string, unknown> = { householdId };
  const days = Number(req.query.expiringWithinDays || 0);
  if (days > 0) {
    const until = new Date();
    until.setDate(until.getDate() + days);
    where.expiryDate = { [Op.lte]: until.toISOString().slice(0, 10) };
  }
  const items = await PantryItem.findAll({ where, order: [['expiryDate', 'ASC']] });
  return sendSuccess(res, { items });
};

export const createPantryItem = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  await assertHouseholdMember(req.user.id, req.body.householdId);
  const suggested = suggestCategoryAndAisle(req.body.name);
  const item = await PantryItem.create({
    ...req.body,
    category: req.body.category || suggested.category,
  });
  await rememberItem({
    householdId: item.householdId,
    name: item.name,
    category: item.category,
    aisleSection: suggested.aisleSection,
    quantity: item.quantity,
    unit: item.unit,
  });
  emitHousehold(req, item.householdId, 'pantry:updated', { item });
  return sendSuccess(res, { item }, 201);
};

export const updatePantryItem = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const item = await PantryItem.findByPk(req.params.id);
  if (!item) throw new AppError('Not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, item.householdId);
  await item.update(req.body);
  emitHousehold(req, item.householdId, 'pantry:updated', { item });
  return sendSuccess(res, { item });
};

export const deletePantryItem = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const item = await PantryItem.findByPk(req.params.id);
  if (!item) throw new AppError('Not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, item.householdId);
  const householdId = item.householdId;
  await item.destroy();
  emitHousehold(req, householdId, 'pantry:updated', { itemId: req.params.id, deleted: true });
  return sendSuccess(res, { message: 'Deleted' });
};

export const addPantryToList = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const pantry = await PantryItem.findByPk(req.params.id);
  if (!pantry) throw new AppError('Not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, pantry.householdId);
  const list = await GroceryList.findByPk(req.body.listId);
  if (!list || list.householdId !== pantry.householdId) {
    throw new AppError('List not found', 404, 'NOT_FOUND');
  }
  const suggested = suggestCategoryAndAisle(pantry.name);
  const item = await ListItem.create({
    listId: list.id,
    name: pantry.name,
    category: pantry.category || suggested.category,
    aisleSection: suggested.aisleSection,
    quantity: Math.max(1, (pantry.lowStockThreshold || 1) - pantry.quantity) || 1,
    unit: pantry.unit,
    createdBy: req.user.id,
  });
  await rememberItem({
    householdId: list.householdId,
    name: item.name,
    category: item.category,
    aisleSection: item.aisleSection,
    quantity: item.quantity,
    unit: item.unit,
  });
  emitHousehold(req, list.householdId, 'item:updated', { listId: list.id, item });
  return sendSuccess(res, { item }, 201);
};
