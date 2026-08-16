import { Response } from 'express';
import { Op } from 'sequelize';
import { createMealLogSchema, updateMealPlanSchema } from '@marketlist/shared';
import {
  Household,
  HouseholdMember,
  MealLog,
  MealPlan,
  NutritionProfile,
  PantryItem,
  Recipe,
  RecipeIngredient,
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import {
  addMacros,
  emptyMacros,
  estimateGrams,
  macrosFromPer100g,
  scaleMacros,
  type MacroSet,
} from '../services/nutrition';
import { AppError, sendSuccess } from '../utils/http';

export const createMealLogValidators = [validateBody(createMealLogSchema)];
export const updateMealPlanValidators = [validateBody(updateMealPlanSchema)];

const assertHouseholdMember = async (userId: string, householdId: string) => {
  const member = await HouseholdMember.findOne({ where: { userId, householdId } });
  if (!member) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  return member;
};

const namesLooseMatch = (a: string, b: string): boolean => {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
};

const findProfileForIngredient = async (
  name: string,
  householdId: string,
): Promise<NutritionProfile | null> => {
  const canonical = name.trim().toLowerCase();
  const householdHit = await NutritionProfile.findOne({
    where: {
      householdId,
      canonicalName: { [Op.iLike]: `%${canonical.slice(0, 40)}%` },
    },
  });
  if (householdHit) return householdHit;
  const global = await NutritionProfile.findAll({
    where: { householdId: null },
    limit: 400,
  });
  return (
    global.find(
      (p) =>
        namesLooseMatch(p.canonicalName, canonical) || namesLooseMatch(p.name, canonical),
    ) || null
  );
};

export const computeRecipeMacros = async (
  recipeId: string,
  householdId: string,
): Promise<{ perRecipe: MacroSet; servings: number; perServing: MacroSet }> => {
  const recipe = await Recipe.findByPk(recipeId, {
    include: [{ model: RecipeIngredient, as: 'ingredients' }],
  });
  if (!recipe) throw new AppError('Recipe not found', 404, 'NOT_FOUND');
  const ingredients =
    (recipe as Recipe & { ingredients?: RecipeIngredient[] }).ingredients || [];
  let total = emptyMacros();
  for (const ing of ingredients) {
    let profile: NutritionProfile | null = null;
    if (ing.nutritionProfileId) {
      profile = await NutritionProfile.findByPk(ing.nutritionProfileId);
    }
    if (!profile) {
      profile = await findProfileForIngredient(ing.name, householdId);
      if (profile && !ing.nutritionProfileId) {
        await ing.update({ nutritionProfileId: profile.id });
      }
    }
    if (!profile) continue;
    const grams = estimateGrams(ing.quantity, ing.unit);
    total = addMacros(
      total,
      macrosFromPer100g(
        {
          kcalPer100g: profile.kcalPer100g,
          proteinG: profile.proteinG,
          carbG: profile.carbG,
          fatG: profile.fatG,
        },
        grams,
      ),
    );
  }
  const servings = recipe.servings > 0 ? recipe.servings : 4;
  return {
    perRecipe: total,
    servings,
    perServing: scaleMacros(total, 1 / servings),
  };
};

const deductPantryForRecipe = async (
  householdId: string,
  recipeId: string,
  servingsEaten: number,
  recipeServings: number,
) => {
  const recipe = await Recipe.findByPk(recipeId, {
    include: [{ model: RecipeIngredient, as: 'ingredients' }],
  });
  if (!recipe) return [];
  const factor = recipeServings > 0 ? servingsEaten / recipeServings : servingsEaten;
  const ingredients =
    (recipe as Recipe & { ingredients?: RecipeIngredient[] }).ingredients || [];
  const deducted: Array<{ id: string; name: string; quantity: number }> = [];
  for (const ing of ingredients) {
    const pantry = await PantryItem.findOne({
      where: {
        householdId,
        name: { [Op.iLike]: `%${ing.name.trim().slice(0, 40)}%` },
      },
    });
    if (!pantry) continue;
    const useQty = Math.max(0.1, (ing.quantity || 1) * factor);
    const nextQty = Math.max(0, pantry.quantity - useQty);
    await pantry.update({ quantity: nextQty });
    deducted.push({ id: pantry.id, name: pantry.name, quantity: nextQty });
  }
  return deducted;
};

export const createMealLog = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const body = req.body as {
    householdId: string;
    recipeId?: string | null;
    mealPlanId?: string | null;
    name?: string;
    mealType?: string;
    consumedAt: string;
    servingsEaten?: number;
    deductPantry?: boolean;
  };
  await assertHouseholdMember(req.user.id, body.householdId);

  let name = body.name || 'Meal';
  let macros = emptyMacros();
  let servings = body.servingsEaten || 1;
  let recipeServings = 1;

  if (body.recipeId) {
    const recipe = await Recipe.findByPk(body.recipeId);
    if (!recipe) throw new AppError('Recipe not found', 404, 'NOT_FOUND');
    name = body.name || recipe.name;
    const computed = await computeRecipeMacros(body.recipeId, body.householdId);
    recipeServings = computed.servings;
    macros = scaleMacros(computed.perServing, servings);
  }

  let deductedPantry = false;
  let pantryDeducted: Array<{ id: string; name: string; quantity: number }> = [];
  if (body.deductPantry !== false && body.recipeId) {
    pantryDeducted = await deductPantryForRecipe(
      body.householdId,
      body.recipeId,
      servings,
      recipeServings,
    );
    deductedPantry = pantryDeducted.length > 0;
  }

  const log = await MealLog.create({
    userId: req.user.id,
    householdId: body.householdId,
    recipeId: body.recipeId || null,
    mealPlanId: body.mealPlanId || null,
    name,
    mealType: body.mealType || 'dinner',
    consumedAt: body.consumedAt,
    servingsEaten: servings,
    kcal: macros.kcal,
    proteinG: macros.proteinG,
    carbG: macros.carbG,
    fatG: macros.fatG,
    deductedPantry,
  });

  return sendSuccess(
    res,
    {
      log,
      pantryDeducted,
      disclaimer:
        'Nutrition values are lifestyle estimates from known profiles — not medical advice.',
    },
    201,
  );
};

export const listMealLogs = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.query.householdId || '');
  if (!householdId) throw new AppError('householdId required', 400, 'VALIDATION_ERROR');
  await assertHouseholdMember(req.user.id, householdId);
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  const where: Record<string, unknown> = { householdId, userId: req.user.id };
  if (from && to) {
    where.consumedAt = { [Op.between]: [from, to] };
  } else if (from) {
    where.consumedAt = { [Op.gte]: from };
  }
  const logs = await MealLog.findAll({
    where,
    order: [
      ['consumedAt', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    limit: 200,
  });
  return sendSuccess(res, { logs });
};

export const nutritionDayInsight = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.query.householdId || '');
  const day = String(req.query.date || new Date().toISOString().slice(0, 10));
  if (!householdId) throw new AppError('householdId required', 400, 'VALIDATION_ERROR');
  await assertHouseholdMember(req.user.id, householdId);

  const household = await Household.findByPk(householdId);
  const logs = await MealLog.findAll({
    where: { householdId, userId: req.user.id, consumedAt: day },
  });
  const totals = logs.reduce(
    (acc, log) =>
      addMacros(acc, {
        kcal: Number(log.kcal),
        proteinG: Number(log.proteinG),
        carbG: Number(log.carbG),
        fatG: Number(log.fatG),
      }),
    emptyMacros(),
  );

  return sendSuccess(res, {
    date: day,
    totals,
    goals: {
      dailyCalorieGoal: household?.dailyCalorieGoal ?? null,
      proteinGoalG: household?.proteinGoalG ?? null,
      carbGoalG: household?.carbGoalG ?? null,
      fatGoalG: household?.fatGoalG ?? null,
    },
    logs,
    disclaimer:
      'Lifestyle nutrition tracking only. Not medical advice. Values may be incomplete when ingredient profiles are unknown.',
  });
};

export const nutritionWeekInsight = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.query.householdId || '');
  if (!householdId) throw new AppError('householdId required', 400, 'VALIDATION_ERROR');
  await assertHouseholdMember(req.user.id, householdId);

  const from = String(req.query.from || '');
  const to = String(req.query.to || '');
  if (!from || !to) throw new AppError('from and to (YYYY-MM-DD) required', 400, 'VALIDATION_ERROR');

  const household = await Household.findByPk(householdId);
  const logs = await MealLog.findAll({
    where: {
      householdId,
      userId: req.user.id,
      consumedAt: { [Op.between]: [from, to] },
    },
    order: [['consumedAt', 'ASC']],
  });

  const byDay = new Map<string, MacroSet>();
  for (const log of logs) {
    const day = String(log.consumedAt).slice(0, 10);
    const prev = byDay.get(day) || emptyMacros();
    byDay.set(
      day,
      addMacros(prev, {
        kcal: Number(log.kcal),
        proteinG: Number(log.proteinG),
        carbG: Number(log.carbG),
        fatG: Number(log.fatG),
      }),
    );
  }

  const days = [...byDay.entries()].map(([date, totals]) => ({ date, totals }));
  const weekTotals = days.reduce((acc, d) => addMacros(acc, d.totals), emptyMacros());

  return sendSuccess(res, {
    from,
    to,
    days,
    weekTotals,
    goals: {
      dailyCalorieGoal: household?.dailyCalorieGoal ?? null,
      proteinGoalG: household?.proteinGoalG ?? null,
      carbGoalG: household?.carbGoalG ?? null,
      fatGoalG: household?.fatGoalG ?? null,
    },
    logCount: logs.length,
    disclaimer:
      'Lifestyle nutrition tracking only. Not medical advice. Totals only include meals you logged.',
  });
};

export const getRecipeNutrition = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const householdId = String(req.query.householdId || '');
  if (!householdId) throw new AppError('householdId required', 400, 'VALIDATION_ERROR');
  await assertHouseholdMember(req.user.id, householdId);
  const computed = await computeRecipeMacros(String(req.params.id), householdId);
  return sendSuccess(res, {
    ...computed,
    disclaimer: 'Lifestyle estimates from known nutrition profiles — not medical advice.',
  });
};

export const updateMealPlan = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const plan = await MealPlan.findByPk(req.params.id);
  if (!plan || plan.userId !== req.user.id) throw new AppError('Not found', 404, 'NOT_FOUND');
  await plan.update({
    recipeId: req.body.recipeId !== undefined ? req.body.recipeId : plan.recipeId,
    plannedDate: req.body.plannedDate || plan.plannedDate,
    mealType: req.body.mealType || plan.mealType,
    notes: req.body.notes !== undefined ? req.body.notes : plan.notes,
  });
  return sendSuccess(res, { plan });
};

export const listNutritionProfiles = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const q = String(req.query.q || '').trim();
  const where = q
    ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { canonicalName: { [Op.iLike]: `%${q}%` } },
        ],
      }
    : {};
  const profiles = await NutritionProfile.findAll({
    where,
    limit: 50,
    order: [['name', 'ASC']],
  });
  return sendSuccess(res, { profiles });
};
