import { Response } from 'express';
import { Op } from 'sequelize';
import {
  catalogItemSchema,
  createMealPlanSchema,
  createStoreSchema,
  generateMealListSchema,
  normalizeItemName,
  receiptOcrSchema,
  recipeParseSchema,
  reviewLinesSchema,
  suggestCategoryAndAisle,
  updateRecipeSchema,
  upsertPriceSchema,
} from '@marketlist/shared';
import { recognizeReceiptImage } from '../services/ocrService';
import { conflictsWithDietary } from '../services/nutrition';
import { AppError, sendSuccess } from '../utils/http';
import {
  CatalogItem,
  GroceryList,
  Household,
  HouseholdMember,
  ListItem,
  MealPlan,
  NutritionProfile,
  PantryItem,
  PriceHistory,
  Recipe,
  RecipeIngredient,
  Store,
  User,
  MealLog,
  GardenSource,
  GardenYieldEvent,
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { parseRecipePayload } from '../services/recipeParse';

export const parseValidators = [validateBody(recipeParseSchema)];
export const catalogValidators = [validateBody(catalogItemSchema)];
export const storeValidators = [validateBody(createStoreSchema)];
export const priceValidators = [validateBody(upsertPriceSchema)];
export const updateRecipeValidators = [validateBody(updateRecipeSchema)];
export const reviewLinesValidators = [validateBody(reviewLinesSchema)];
export const ocrValidators = [validateBody(receiptOcrSchema)];
export const createMealPlanValidators = [validateBody(createMealPlanSchema)];
export const generateMealListValidators = [validateBody(generateMealListSchema)];

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

const namesLooseMatch = (a: string, b: string): boolean => {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
};

const isInPantry = (ingredientName: string, pantry: PantryItem[]): boolean =>
  pantry.some((p) => namesLooseMatch(p.name, ingredientName));

const recipeConflictsWithDiet = (ingredients: RecipeIngredient[], prefs: string[]): boolean => {
  const joined = ingredients.map((i) => i.name).join(' ');
  return conflictsWithDietary(joined, prefs);
};

type RecipeSuggestion = {
  id: string;
  name: string;
  matchPercentage: number;
  missingIngredients: string[];
  expiringIngredientNames?: string[];
  gardenIngredientNames?: string[];
  grownMatchCount?: number;
};

type GardenYieldLike = {
  plantName: string;
  status: string;
  expectedHarvestStart: string | null;
  expectedHarvestEnd: string | null;
};

const isYieldSoonOrReady = (yieldEvent: GardenYieldLike, withinDays: number): boolean => {
  if (yieldEvent.status === 'harvested') return false;
  if (yieldEvent.status === 'ready') return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(today);
  until.setDate(until.getDate() + withinDays);
  const start = yieldEvent.expectedHarvestStart
    ? new Date(yieldEvent.expectedHarvestStart)
    : null;
  const end = yieldEvent.expectedHarvestEnd ? new Date(yieldEvent.expectedHarvestEnd) : null;
  if (start && !Number.isNaN(start.getTime())) {
    if (start <= until && (!end || end >= today)) return true;
  }
  if (end && !Number.isNaN(end.getTime()) && end >= today && end <= until) return true;
  return false;
};

const buildRecipeSuggestions = (
  recipes: Recipe[],
  pantry: PantryItem[],
  dietaryPrefs: string[],
  options?: {
    requireExpiringMatch?: boolean;
    expiringPantry?: PantryItem[];
    gardenYields?: GardenYieldLike[];
    gardenWithinDays?: number;
  },
): RecipeSuggestion[] => {
  const expiringPantry = options?.expiringPantry || [];
  const requireExpiringMatch = options?.requireExpiringMatch === true;
  const gardenYields = (options?.gardenYields || []).filter((y) =>
    isYieldSoonOrReady(y, options?.gardenWithinDays ?? 7),
  );

  return recipes
    .map((r) => {
      const ingredients =
        (r as Recipe & { ingredients?: RecipeIngredient[] }).ingredients || [];
      if (recipeConflictsWithDiet(ingredients, dietaryPrefs)) {
        return null;
      }

      const expiringIngredientNames = ingredients
        .filter((ing) => isInPantry(ing.name, expiringPantry))
        .map((ing) => ing.name);

      if (requireExpiringMatch && expiringIngredientNames.length === 0) {
        return null;
      }

      const gardenIngredientNames = ingredients
        .filter((ing) => gardenYields.some((y) => namesLooseMatch(y.plantName, ing.name)))
        .map((ing) => ing.name);

      const total = ingredients.length;
      const missingIngredients: string[] = [];
      let matched = 0;
      let grownMatchCount = 0;

      for (const ing of ingredients) {
        const inPantry = isInPantry(ing.name, pantry);
        const fromGarden = gardenYields.some((y) => namesLooseMatch(y.plantName, ing.name));
        if (fromGarden) grownMatchCount += 1;
        if (inPantry || fromGarden) {
          matched += 1;
        } else {
          missingIngredients.push(ing.name);
        }
      }

      let matchPercentage = total === 0 ? 100 : Math.round((matched / total) * 100);
      // Prefer recipes that use soon-ready / grown ingredients
      if (grownMatchCount > 0) {
        matchPercentage = Math.min(100, matchPercentage + grownMatchCount * 5);
      }

      const suggestion: RecipeSuggestion = {
        id: r.id,
        name: r.name,
        matchPercentage,
        missingIngredients,
      };
      if (requireExpiringMatch) {
        suggestion.expiringIngredientNames = expiringIngredientNames;
      }
      if (gardenIngredientNames.length) {
        suggestion.gardenIngredientNames = gardenIngredientNames;
        suggestion.grownMatchCount = grownMatchCount;
      }
      return suggestion;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
};

export const listCatalog = async (req: AuthRequest, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.category) where.category = req.query.category;
  if (req.query.search) where.name = { [Op.iLike]: `%${req.query.search}%` };
  const items = await CatalogItem.findAll({ where, limit: Number(req.query.limit || 50) });
  return sendSuccess(res, { items, total: items.length });
};

export const createCatalogItem = async (req: AuthRequest, res: Response) => {
  const item = await CatalogItem.create(req.body);
  return sendSuccess(res, { item }, 201);
};

export const parseRecipe = async (req: AuthRequest, res: Response) => {
  const result = await parseRecipePayload(req.body);
  return sendSuccess(res, result);
};

export const listRecipes = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const recipes = await Recipe.findAll({
    where: { userId: req.user.id },
    include: [{ model: RecipeIngredient, as: 'ingredients' }],
  });
  return sendSuccess(res, { recipes });
};

export const createRecipe = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = req.body.householdId || null;
  if (householdId) await assertHouseholdMember(req.user.id, householdId);
  const recipe = await Recipe.create({
    userId: req.user.id,
    householdId,
    name: req.body.name,
    instructions: req.body.instructions || null,
    category: req.body.category || null,
    servings: Number(req.body.servings) > 0 ? Number(req.body.servings) : 4,
  });
  const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients : [];
  for (const ing of ingredients) {
    await RecipeIngredient.create({
      recipeId: recipe.id,
      name: ing.name,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
    });
  }
  const full = await Recipe.findByPk(recipe.id, {
    include: [{ model: RecipeIngredient, as: 'ingredients' }],
  });
  return sendSuccess(res, { recipe: full }, 201);
};

export const getRecipe = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const recipe = await Recipe.findByPk(req.params.id, {
    include: [{ model: RecipeIngredient, as: 'ingredients' }],
  });
  if (!recipe) throw new AppError('Not found', 404, 'NOT_FOUND');
  if (recipe.userId === req.user.id) {
    return sendSuccess(res, { recipe });
  }
  if (recipe.householdId) {
    await assertHouseholdMember(req.user.id, recipe.householdId);
    return sendSuccess(res, { recipe });
  }
  throw new AppError('Not found', 404, 'NOT_FOUND');
};

export const updateRecipe = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const recipe = await Recipe.findByPk(req.params.id);
  if (!recipe || recipe.userId !== req.user.id) throw new AppError('Not found', 404, 'NOT_FOUND');

  if (req.body.name !== undefined) recipe.name = req.body.name;
  if (req.body.instructions !== undefined) recipe.instructions = req.body.instructions;
  if (req.body.category !== undefined) recipe.category = req.body.category;
  if (req.body.servings !== undefined && Number(req.body.servings) > 0) {
    recipe.servings = Number(req.body.servings);
  }
  await recipe.save();

  if (Array.isArray(req.body.ingredients)) {
    await RecipeIngredient.destroy({ where: { recipeId: recipe.id } });
    for (const ing of req.body.ingredients) {
      await RecipeIngredient.create({
        recipeId: recipe.id,
        name: ing.name,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
      });
    }
  }

  const full = await Recipe.findByPk(recipe.id, {
    include: [{ model: RecipeIngredient, as: 'ingredients' }],
  });
  return sendSuccess(res, { recipe: full });
};

export const deleteRecipe = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const recipe = await Recipe.findByPk(req.params.id);
  if (!recipe || recipe.userId !== req.user.id) throw new AppError('Not found', 404, 'NOT_FOUND');
  await RecipeIngredient.destroy({ where: { recipeId: recipe.id } });
  await recipe.destroy();
  return sendSuccess(res, { message: 'Deleted' });
};

export const recipeSuggestions = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

  const user = await User.findByPk(req.user.id);
  const dietaryPrefs = (user?.dietaryPrefs || []).map((p) => p.toLowerCase());

  const recipes = await Recipe.findAll({
    where: { userId: req.user.id },
    include: [{ model: RecipeIngredient, as: 'ingredients' }],
  });

  let pantry: PantryItem[] = [];
  const householdId = req.query.householdId ? String(req.query.householdId) : null;
  let household: Household | null = null;
  let gardenYields: GardenYieldEvent[] = [];
  if (householdId) {
    const member = await HouseholdMember.findOne({
      where: { userId: req.user.id, householdId },
    });
    if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
    pantry = await PantryItem.findAll({ where: { householdId } });
    household = await Household.findByPk(householdId);
    gardenYields = await GardenYieldEvent.findAll({
      where: { householdId, status: { [Op.ne]: 'harvested' } },
    });
  }

  const suggestions = buildRecipeSuggestions(recipes, pantry, dietaryPrefs, {
    gardenYields,
    gardenWithinDays: 7,
  }).sort((a, b) => b.matchPercentage - a.matchPercentage);

  const quietHints: string[] = [];
  if (household?.dailyCalorieGoal) {
    quietHints.push(
      `Household calorie goal is set (${household.dailyCalorieGoal} kcal/day). Log cooked meals to see progress — lifestyle tracking only, not medical advice.`,
    );
  }
  if (dietaryPrefs.length) {
    quietHints.push(
      `Suggestions already hide recipes that conflict with: ${dietaryPrefs.join(', ')}.`,
    );
  }
  if (suggestions.some((s) => s.matchPercentage >= 80)) {
    quietHints.push('You have high pantry-match recipes — quiet cook candidates for tonight.');
  }
  const gardenReady = gardenYields.filter((y) => isYieldSoonOrReady(y, 7));
  if (gardenReady.length) {
    const names = [...new Set(gardenReady.map((y) => y.plantName))].slice(0, 4).join(', ');
    quietHints.push(
      `Garden ready or soon: ${names}. Recipes that use home-grown produce are ranked higher.`,
    );
  }
  const grownHits = suggestions.filter((s) => (s.grownMatchCount || 0) > 0);
  if (grownHits.length) {
    quietHints.push(
      `${grownHits.length} recipe(s) match plants that are ready or nearing harvest.`,
    );
  }

  return sendSuccess(res, {
    suggestions,
    total: suggestions.length,
    quietHints,
    disclaimer: 'Quiet lifestyle suggestions only — not medical or clinical advice.',
  });
};

/** Recipes that use pantry items expiring within N days (default 5). */
export const recipeSuggestionsExpiring = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

  const user = await User.findByPk(req.user.id);
  const dietaryPrefs = (user?.dietaryPrefs || []).map((p) => p.toLowerCase());

  const withinDays = Math.max(1, Number(req.query.withinDays || 5) || 5);
  const until = new Date();
  until.setHours(0, 0, 0, 0);
  until.setDate(until.getDate() + withinDays);
  const untilKey = until.toISOString().slice(0, 10);

  const recipes = await Recipe.findAll({
    where: { userId: req.user.id },
    include: [{ model: RecipeIngredient, as: 'ingredients' }],
  });

  let pantry: PantryItem[] = [];
  let expiringPantry: PantryItem[] = [];
  const householdId = requireHouseholdId(req.query.householdId);
  await assertHouseholdMember(req.user.id, householdId);
  pantry = await PantryItem.findAll({ where: { householdId } });
  expiringPantry = pantry.filter((item) => {
    if (!item.expiryDate) return false;
    const key =
      typeof item.expiryDate === 'string'
        ? String(item.expiryDate).slice(0, 10)
        : new Date(item.expiryDate).toISOString().slice(0, 10);
    return key <= untilKey;
  });

  const gardenYields = await GardenYieldEvent.findAll({
    where: { householdId, status: { [Op.ne]: 'harvested' } },
  });

  const suggestions = buildRecipeSuggestions(recipes, pantry, dietaryPrefs, {
    requireExpiringMatch: true,
    expiringPantry,
    gardenYields,
    gardenWithinDays: withinDays,
  }).sort((a, b) => b.matchPercentage - a.matchPercentage);

  return sendSuccess(res, {
    suggestions,
    total: suggestions.length,
    withinDays,
    expiringItemCount: expiringPantry.length,
    quietHints:
      expiringPantry.length > 0
        ? [
            'Cook recipes that use items expiring soon to reduce waste — lifestyle guidance only.',
          ]
        : [],
    disclaimer: 'Quiet lifestyle suggestions only — not medical or clinical advice.',
  });
};

export const listMealPlans = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const plans = await MealPlan.findAll({
    where: { userId: req.user.id },
    include: [Recipe],
    order: [['plannedDate', 'ASC']],
  });
  return sendSuccess(res, { plans });
};

export const createMealPlan = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = req.body.householdId || null;
  if (householdId) await assertHouseholdMember(req.user.id, householdId);
  const plan = await MealPlan.create({
    userId: req.user.id,
    householdId,
    recipeId: req.body.recipeId || null,
    plannedDate: req.body.plannedDate,
    mealType: req.body.mealType || 'dinner',
    notes: req.body.notes || null,
  });
  return sendSuccess(res, { plan }, 201);
};

export const deleteMealPlan = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const plan = await MealPlan.findByPk(req.params.id);
  if (!plan || plan.userId !== req.user.id) throw new AppError('Not found', 404, 'NOT_FOUND');
  await plan.destroy();
  return sendSuccess(res, { message: 'Deleted' });
};

export const generateListFromMealPlans = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const { listId, from, to } = req.body;
  const missingOnly = req.body.missingOnly !== false;

  if (!listId || !from || !to) {
    throw new AppError('listId, from, and to are required', 400, 'VALIDATION_ERROR');
  }

  const list = await GroceryList.findByPk(listId);
  if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
  await assertHouseholdMember(req.user.id, list.householdId);

  let pantry: PantryItem[] = [];
  if (missingOnly && list.householdId) {
    pantry = await PantryItem.findAll({ where: { householdId: list.householdId } });
  }

  const plans = await MealPlan.findAll({
    where: {
      userId: req.user.id,
      plannedDate: { [Op.between]: [from, to] },
    },
    include: [{ model: Recipe, include: [{ model: RecipeIngredient, as: 'ingredients' }] }],
  });

  const created = [];
  const seen = new Set<string>();

  for (const plan of plans) {
    const recipe = (plan as MealPlan & { Recipe?: Recipe & { ingredients?: RecipeIngredient[] } })
      .Recipe;
    for (const ing of recipe?.ingredients || []) {
      const key = normalizeItemName(ing.name);
      if (seen.has(key)) continue;
      if (missingOnly && isInPantry(ing.name, pantry)) continue;
      seen.add(key);

      const suggested = suggestCategoryAndAisle(ing.name);
      const item = await ListItem.create({
        listId,
        name: ing.name,
        quantity: ing.quantity || 1,
        unit: ing.unit,
        category: suggested.category,
        aisleSection: suggested.aisleSection,
        createdBy: req.user.id,
      });
      created.push(item);
    }
  }

  return sendSuccess(res, { items: created }, 201);
};

export const listStores = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = requireHouseholdId(req.query.householdId);
  await assertHouseholdMember(req.user.id, householdId);
  const stores = await Store.findAll({ where: { householdId } });
  return sendSuccess(res, { stores });
};

export const createStore = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = requireHouseholdId(req.body.householdId);
  await assertHouseholdMember(req.user.id, householdId);
  const store = await Store.create({
    name: req.body.name,
    householdId,
  });
  return sendSuccess(res, { store }, 201);
};

export const upsertPrice = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = requireHouseholdId(req.body.householdId);
  await assertHouseholdMember(req.user.id, householdId);
  const entry = await PriceHistory.create({
    itemName: req.body.itemName,
    storeId: req.body.storeId,
    price: req.body.price,
    recordedAt: req.body.recordedAt ? new Date(req.body.recordedAt) : new Date(),
    householdId,
    category: req.body.category || null,
    gtin: req.body.gtin || null,
  });
  return sendSuccess(res, { entry }, 201);
};

/** PUT /prices/items/:itemName/stores/:storeId — path params merged into body before create. */
export const upsertPriceByPath = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const itemNameParam = req.params.itemName ? decodeURIComponent(String(req.params.itemName)) : undefined;
  const storeIdParam = req.params.storeId ? String(req.params.storeId) : undefined;
  const parsed = upsertPriceSchema.safeParse({
    ...req.body,
    itemName: itemNameParam || req.body?.itemName,
    storeId: storeIdParam || req.body?.storeId,
  });
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0]?.message || 'Validation failed', 400, 'VALIDATION_ERROR');
  }
  const householdId = requireHouseholdId(parsed.data.householdId);
  await assertHouseholdMember(req.user.id, householdId);
  const entry = await PriceHistory.create({
    itemName: parsed.data.itemName,
    storeId: parsed.data.storeId,
    price: parsed.data.price,
    recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date(),
    householdId,
    category: parsed.data.category || null,
    gtin: parsed.data.gtin || null,
  });
  return sendSuccess(res, { entry }, 201);
};

export const priceHistory = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = requireHouseholdId(req.query.householdId);
  await assertHouseholdMember(req.user.id, householdId);
  const history = await PriceHistory.findAll({
    where: {
      householdId,
      itemName: { [Op.iLike]: String(req.params.itemName) },
    },
    include: [Store],
    order: [['recordedAt', 'DESC']],
    limit: 100,
  });
  return sendSuccess(res, { itemName: req.params.itemName, history });
};

export const bestDeals = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = req.query.householdId ? String(req.query.householdId) : null;
  if (!householdId) throw new AppError('householdId required', 400, 'VALIDATION_ERROR');
  const member = await HouseholdMember.findOne({
    where: { userId: req.user.id, householdId },
  });
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');

  const rows = await PriceHistory.findAll({
    where: { householdId },
    include: [Store],
    order: [['recordedAt', 'DESC']],
    limit: 200,
  });
  const byItem = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byItem.get(row.itemName) || [];
    list.push(row);
    byItem.set(row.itemName, list);
  }
  const deals = [...byItem.entries()].map(([itemName, prices]) => {
    const nums = prices.map((p) => Number(p.price));
    const lowest = Math.min(...nums);
    const average = nums.reduce((a, b) => a + b, 0) / nums.length;
    const best = prices.find((p) => Number(p.price) === lowest);
    return {
      itemName,
      lowestPrice: lowest,
      averagePrice: average,
      discount: average ? ((average - lowest) / average) * 100 : 0,
      bestStore: best
        ? {
            storeId: best.storeId,
            storeName: (best as PriceHistory & { Store?: Store }).Store?.name,
            price: lowest,
          }
        : null,
    };
  });
  return sendSuccess(res, { deals });
};

export const spendingInsights = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = requireHouseholdId(req.query.householdId);
  await assertHouseholdMember(req.user.id, householdId);
  const rows = await PriceHistory.findAll({ where: { householdId } });
  const byCategory: Record<string, number> = {};
  for (const row of rows) {
    const key = row.category || 'Uncategorized';
    byCategory[key] = (byCategory[key] || 0) + Number(row.price);
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthRows = rows.filter((row) => new Date(row.recordedAt) >= monthStart);
  const monthByCategory: Record<string, number> = {};
  let monthTotal = 0;
  for (const row of monthRows) {
    const key = row.category || 'Uncategorized';
    const amount = Number(row.price);
    monthByCategory[key] = (monthByCategory[key] || 0) + amount;
    monthTotal += amount;
  }

  let monthlyBudgetGoal: number | null = null;
  const household = await Household.findByPk(householdId);
  monthlyBudgetGoal =
    household?.monthlyBudgetGoal != null ? Number(household.monthlyBudgetGoal) : null;

  return sendSuccess(res, {
    byCategory,
    total: Object.values(byCategory).reduce((a, b) => a + b, 0),
    monthByCategory,
    monthTotal,
    monthlyBudgetGoal,
  });
};

type RestockUrgency = 'expired' | 'soon' | 'low' | 'habit';

type RestockSuggestion = {
  itemName: string;
  reason: string;
  lastPrice?: number;
  pantryId?: string;
  urgency: RestockUrgency;
};

export const restockInsights = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

  const memberships = await HouseholdMember.findAll({ where: { userId: req.user.id } });
  const householdIds = memberships.map((m) => m.householdId);
  const suggestions: RestockSuggestion[] = [];
  const seen = new Set<string>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fiveDaysFromNow = new Date(today);
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  if (householdIds.length) {
    const pantryItems = await PantryItem.findAll({
      where: { householdId: { [Op.in]: householdIds } },
    });

    for (const item of pantryItems) {
      const key = normalizeItemName(item.name);
      const threshold = item.lowStockThreshold;
      const isLow =
        threshold !== null && threshold !== undefined && Number(item.quantity) <= Number(threshold);

      let urgency: RestockUrgency | null = null;
      let reason = '';

      if (item.expiryDate) {
        const expiry = new Date(item.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        if (expiry < today) {
          urgency = 'expired';
          reason = 'Expired — restock or discard';
        } else if (expiry <= fiveDaysFromNow) {
          urgency = 'soon';
          reason = 'Expires within 5 days';
        }
      }

      if (!urgency && isLow) {
        urgency = 'low';
        reason = 'Low stock';
      } else if (urgency && isLow && urgency !== 'expired') {
        reason = `${reason}; also low stock`;
      }

      if (!urgency) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        itemName: item.name,
        reason,
        pantryId: item.id,
        urgency,
      });
    }
  }

  const priceRows = await PriceHistory.findAll({
    where: householdIds.length ? { householdId: { [Op.in]: householdIds } } : {},
    order: [['recordedAt', 'ASC']],
    limit: 500,
  });

  const byItem = new Map<string, PriceHistory[]>();
  for (const row of priceRows) {
    const list = byItem.get(row.itemName) || [];
    list.push(row);
    byItem.set(row.itemName, list);
  }

  const now = Date.now();
  for (const [itemName, rows] of byItem.entries()) {
    if (rows.length < 2) continue;
    const key = normalizeItemName(itemName);
    if (seen.has(key)) continue;

    const sorted = [...rows].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(sorted[i - 1].recordedAt).getTime();
      const curr = new Date(sorted[i].recordedAt).getTime();
      gaps.push((curr - prev) / 86400000);
    }
    if (!gaps.length) continue;

    const avgDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const last = sorted[sorted.length - 1];
    const daysSinceLast = (now - new Date(last.recordedAt).getTime()) / 86400000;

    if (daysSinceLast < avgDays * 0.8) continue;

    seen.add(key);
    suggestions.push({
      itemName,
      reason: `Usually purchased about every ${Math.round(avgDays)} days`,
      lastPrice: Number(last.price),
      urgency: 'habit',
    });
  }

  return sendSuccess(res, { suggestions, optInRequired: true });
};

export const barcodeLookup = async (req: AuthRequest, res: Response) => {
  const barcode = String(req.body.barcode || '');
  if (!barcode) throw new AppError('barcode required', 400, 'VALIDATION_ERROR');
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
    );
    const data = (await response.json()) as {
      status: number;
      product?: {
        product_name?: string;
        categories_tags?: string[];
        nutriments?: Record<string, number | undefined>;
      };
    };
    if (data.status !== 1 || !data.product) {
      return sendSuccess(res, { found: false, barcode });
    }
    const nut = data.product.nutriments || {};
    const kcalPer100g =
      nut['energy-kcal_100g'] ??
      (nut['energy-kj_100g'] ? Number(nut['energy-kj_100g']) / 4.184 : null);
    const proteinG = nut.proteins_100g ?? null;
    const carbG = nut.carbohydrates_100g ?? null;
    const fatG = nut.fat_100g ?? null;
    let nutritionProfileId: string | null = null;
    if (kcalPer100g != null && Number.isFinite(Number(kcalPer100g))) {
      const canonical = (data.product.product_name || barcode).trim().toLowerCase();
      let profile = await NutritionProfile.findOne({
        where: { gtin: barcode, source: 'off' },
      });
      if (!profile) {
        profile = await NutritionProfile.create({
          name: data.product.product_name || 'Unknown product',
          canonicalName: canonical,
          gtin: barcode,
          householdId: null,
          kcalPer100g: Number(kcalPer100g),
          proteinG: Number(proteinG || 0),
          carbG: Number(carbG || 0),
          fatG: Number(fatG || 0),
          fiberG: nut.fiber_100g != null ? Number(nut.fiber_100g) : null,
          sodiumMg: nut.sodium_100g != null ? Number(nut.sodium_100g) * 1000 : null,
          sugarG: nut.sugars_100g != null ? Number(nut.sugars_100g) : null,
          source: 'off',
        });
      }
      nutritionProfileId = profile.id;
    }
    return sendSuccess(res, {
      found: true,
      barcode,
      gtin: barcode,
      name: data.product.product_name || 'Unknown product',
      category: data.product.categories_tags?.[0] || null,
      nutrition: {
        kcalPer100g: kcalPer100g != null ? Number(kcalPer100g) : null,
        proteinG: proteinG != null ? Number(proteinG) : null,
        carbG: carbG != null ? Number(carbG) : null,
        fatG: fatG != null ? Number(fatG) : null,
        nutritionProfileId,
      },
      disclaimer: 'Nutrition from Open Food Facts when available — lifestyle information, not medical advice.',
    });
  } catch {
    return sendSuccess(res, { found: false, barcode, error: 'lookup_failed' });
  }
};

export const receiptOcr = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  try {
    const result = await recognizeReceiptImage(req.body.imageBase64, req.body.mimeType || 'image/jpeg');
    return sendSuccess(res, {
      lines: result.lines,
      rawText: result.rawText,
      confidence: result.confidence,
      lineCount: result.lines.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OCR failed';
    throw new AppError(message, 400, 'OCR_FAILED');
  }
};

export const reviewCaptureLines = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

  const { listId, storeId, householdId, lines } = req.body as {
    listId?: string;
    storeId?: string;
    householdId?: string;
    lines: Array<{
      name: string;
      quantity?: number;
      unit?: string | null;
      price?: number;
      gtin?: string | null;
      addToList?: boolean;
      addToPantry?: boolean;
      recordPrice?: boolean;
    }>;
  };

  if (!Array.isArray(lines) || lines.length === 0) {
    throw new AppError('lines required', 400, 'VALIDATION_ERROR');
  }

  let list: GroceryList | null = null;
  if (listId) {
    list = await GroceryList.findByPk(listId);
    if (!list) throw new AppError('List not found', 404, 'NOT_FOUND');
    const member = await HouseholdMember.findOne({
      where: { userId: req.user.id, householdId: list.householdId },
    });
    if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  const resolvedHouseholdId = householdId || list?.householdId || null;
  if (resolvedHouseholdId) {
    const member = await HouseholdMember.findOne({
      where: { userId: req.user.id, householdId: resolvedHouseholdId },
    });
    if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  const listItems = [];
  const pantryItems = [];
  const priceEntries = [];

  for (const line of lines) {
    const addToList = line.addToList !== false;
    const addToPantry = Boolean(line.addToPantry);
    const recordPrice = Boolean(line.recordPrice);
    const suggested = suggestCategoryAndAisle(line.name);

    if (addToList) {
      if (!list) throw new AppError('listId required when addToList is true', 400, 'VALIDATION_ERROR');
      const item = await ListItem.create({
        listId: list.id,
        name: line.name,
        quantity: line.quantity ?? 1,
        unit: line.unit ?? null,
        category: suggested.category,
        aisleSection: suggested.aisleSection,
        createdBy: req.user.id,
      });
      listItems.push(item);
    }

    if (addToPantry) {
      if (!resolvedHouseholdId) {
        throw new AppError('householdId required when addToPantry is true', 400, 'VALIDATION_ERROR');
      }
      const pantryItem = await PantryItem.create({
        householdId: resolvedHouseholdId,
        name: line.name,
        category: suggested.category,
        quantity: line.quantity ?? 1,
        unit: line.unit ?? null,
        expiryDate: null,
        lowStockThreshold: null,
      });
      pantryItems.push(pantryItem);
    }

    if (recordPrice) {
      if (!storeId) {
        throw new AppError('storeId required when recordPrice is true', 400, 'VALIDATION_ERROR');
      }
      if (line.price === undefined || line.price === null) {
        throw new AppError('price required when recordPrice is true', 400, 'VALIDATION_ERROR');
      }
      const entry = await PriceHistory.create({
        itemName: line.name,
        storeId,
        price: line.price,
        recordedAt: new Date(),
        householdId: resolvedHouseholdId,
        category: suggested.category || null,
        gtin: line.gtin || null,
      });
      priceEntries.push(entry);
    }
  }

  return sendSuccess(
    res,
    {
      listItems,
      pantryItems,
      priceEntries,
      reviewed: lines.length,
    },
    201,
  );
};

export const exportMyData = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const memberships = await HouseholdMember.findAll({ where: { userId: req.user.id } });
  const householdIds = memberships.map((m) => m.householdId);
  const lists = householdIds.length
    ? await GroceryList.findAll({
        where: { householdId: householdIds },
        include: [{ model: ListItem, as: 'items' }],
      })
    : [];
  const pantry = householdIds.length
    ? await PantryItem.findAll({ where: { householdId: householdIds } })
    : [];
  const recipes = await Recipe.findAll({ where: { userId: req.user.id } });
  const mealLogs = householdIds.length
    ? await MealLog.findAll({ where: { householdId: { [Op.in]: householdIds }, userId: req.user.id } })
    : [];
  const gardenSources = householdIds.length
    ? await GardenSource.findAll({ where: { householdId: { [Op.in]: householdIds } } })
    : [];
  const gardenYields = householdIds.length
    ? await GardenYieldEvent.findAll({ where: { householdId: { [Op.in]: householdIds } } })
    : [];
  return sendSuccess(res, {
    user: { id: req.user.id, email: req.user.email, name: req.user.name },
    households: householdIds,
    lists,
    pantry,
    recipes,
    mealLogs,
    gardenSources: gardenSources.map((s) => {
      const json = s.toJSON() as Record<string, unknown>;
      delete json.farmbotApiToken;
      return { ...json, hasFarmbotToken: Boolean(s.farmbotApiToken) };
    }),
    gardenYields,
    exportedAt: new Date().toISOString(),
  });
};
