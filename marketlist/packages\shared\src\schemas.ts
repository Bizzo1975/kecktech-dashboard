import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Body refreshToken is optional — web/mobile may send httpOnly cookie only. */
export const refreshSchema = z.object({
  refreshToken: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8),
});

export const updatePreferencesSchema = z.object({
  dietaryPrefs: z.array(z.enum(['vegetarian', 'vegan', 'gluten_free', 'dairy_free'])).max(8),
  notifyExpiring: z.boolean().optional(),
  notifyTripReminder: z.boolean().optional(),
});

export const pushTokenSchema = z.object({
  pushToken: z.string().min(1).max(512),
});

export const createHouseholdSchema = z.object({
  name: z.string().min(1).max(120),
});

export const joinHouseholdSchema = z.object({
  inviteCode: z.string().min(4).max(12),
});

export const listTypeSchema = z.enum(['shopping', 'template']);

export const createListSchema = z.object({
  householdId: z.string().uuid(),
  name: z.string().min(1).max(120),
  sortMode: z.enum(['aisle', 'category', 'custom']).optional().default('aisle'),
  type: listTypeSchema.optional().default('shopping'),
});

export const updateListSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  sortMode: z.enum(['aisle', 'category', 'custom']).optional(),
  type: listTypeSchema.optional(),
});

export const copyListSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  type: listTypeSchema.optional().default('shopping'),
});

export const createListItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().optional(),
  aisleSection: z.string().optional(),
  quantity: z.number().positive().optional().default(1),
  unit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
  assigneeUserId: z.string().uuid().nullable().optional(),
});

export const updateListItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().optional(),
  aisleSection: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  checked: z.boolean().optional(),
  sortOrder: z.number().int().optional().nullable(),
  assigneeUserId: z.string().uuid().nullable().optional(),
});

export const updateHouseholdSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  monthlyBudgetGoal: z.number().nonnegative().nullable().optional(),
  dailyCalorieGoal: z.number().int().positive().nullable().optional(),
  proteinGoalG: z.number().nonnegative().nullable().optional(),
  carbGoalG: z.number().nonnegative().nullable().optional(),
  fatGoalG: z.number().nonnegative().nullable().optional(),
});

export const createPantryItemSchema = z.object({
  householdId: z.string().uuid(),
  name: z.string().min(1).max(200),
  category: z.string().optional(),
  quantity: z.number().nonnegative().optional().default(1),
  unit: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  lowStockThreshold: z.number().nonnegative().optional().nullable(),
});

export const updatePantryItemSchema = createPantryItemSchema.partial().omit({ householdId: true });

export const addPantryToListSchema = z.object({
  listId: z.string().uuid(),
});

export const recipeParseSchema = z.object({
  url: z.string().url().optional(),
  text: z.string().min(1).optional(),
}).refine((d) => Boolean(d.url || d.text), { message: 'Provide url or text' });

export const catalogItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional().nullable(),
});

export const createStoreSchema = z.object({
  name: z.string().min(1),
  householdId: z.string().uuid(),
});

export const upsertPriceSchema = z.object({
  itemName: z.string().min(1),
  storeId: z.string().uuid(),
  price: z.number().positive(),
  recordedAt: z.string().datetime().optional(),
  householdId: z.string().uuid(),
  category: z.string().optional().nullable(),
  gtin: z.string().max(32).optional().nullable(),
});

export const completeTripSchema = z.object({
  addCheckedToPantry: z.boolean().optional().default(true),
  storeId: z.string().uuid().optional().nullable(),
  recordPricesFromMemory: z.boolean().optional().default(true),
});

export const createMealPlanSchema = z.object({
  householdId: z.string().uuid().optional().nullable(),
  recipeId: z.string().uuid().optional().nullable(),
  plannedDate: z.string().min(1),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().default('dinner'),
  notes: z.string().optional().nullable(),
});

export const generateMealListSchema = z.object({
  listId: z.string().uuid(),
  from: z.string().min(1),
  to: z.string().min(1),
  missingOnly: z.boolean().optional().default(true),
});

export const updateRecipeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  instructions: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  servings: z.number().positive().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().optional().nullable(),
        unit: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

export const updateMealPlanSchema = z.object({
  recipeId: z.string().uuid().optional().nullable(),
  plannedDate: z.string().min(1).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  notes: z.string().optional().nullable(),
});

export const createMealLogSchema = z.object({
  householdId: z.string().uuid(),
  recipeId: z.string().uuid().optional().nullable(),
  mealPlanId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(200).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().default('dinner'),
  consumedAt: z.string().min(1),
  servingsEaten: z.number().positive().optional().default(1),
  deductPantry: z.boolean().optional().default(true),
});

export const reviewLinesSchema = z.object({
  listId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  householdId: z.string().uuid().optional(),
  lines: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().positive().optional().default(1),
      unit: z.string().optional().nullable(),
      price: z.number().positive().optional().nullable(),
      gtin: z.string().max(32).optional().nullable(),
      addToList: z.boolean().optional().default(true),
      addToPantry: z.boolean().optional().default(false),
      recordPrice: z.boolean().optional().default(false),
    }),
  ),
});

export const receiptOcrSchema = z.object({
  imageBase64: z.string().min(64),
  mimeType: z
    .string()
    .optional()
    .default('image/jpeg')
    .refine((v) => /^image\/(jpeg|jpg|png|webp)$/i.test(v), {
      message: 'mimeType must be image/jpeg, image/png, or image/webp',
    }),
});

// --- Garden sources (manual beds + FarmBot-connected devices) ---

export const gardenSourceTypeSchema = z.enum(['manual', 'farmbot', 'indoor_tray']);

export const createGardenSourceSchema = z.object({
  householdId: z.string().uuid(),
  type: gardenSourceTypeSchema,
  name: z.string().min(1).max(120),
  farmbotDeviceId: z.string().max(120).optional().nullable(),
  /** FarmBot encoded JWT or full token JSON from POST /api/tokens — encrypted at rest; never returned on GET. */
  farmbotApiToken: z.string().max(16384).optional().nullable(),
});

export const updateGardenSourceSchema = createGardenSourceSchema
  .partial()
  .omit({ householdId: true });

export const gardenYieldStatusSchema = z.enum(['planted', 'growing', 'ready', 'harvested']);

export const createGardenYieldEventSchema = z.object({
  householdId: z.string().uuid(),
  gardenSourceId: z.string().uuid(),
  plantName: z.string().min(1).max(200),
  expectedHarvestStart: z.string().optional().nullable(),
  expectedHarvestEnd: z.string().optional().nullable(),
  estimatedYieldQty: z.number().nonnegative().optional().nullable(),
  estimatedYieldUnit: z.string().max(32).optional().nullable(),
  status: gardenYieldStatusSchema.optional().default('planted'),
});

export const updateGardenYieldEventSchema = createGardenYieldEventSchema
  .partial()
  .omit({ householdId: true, gardenSourceId: true });

/** Convert a harvested yield event into a pantry item (or add to an existing one). */
export const harvestGardenYieldEventSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.string().max(32).optional(),
  expiryDate: z.string().optional().nullable(),
});

/** Dangerous FarmBot control actions require explicit confirm: true. */
export const farmbotConfirmSchema = z.object({
  confirm: z.literal(true),
});

export const farmbotHomeAxisSchema = z.enum(['all', 'x', 'y', 'z']);

export const farmbotHomeSchema = farmbotConfirmSchema.extend({
  axis: farmbotHomeAxisSchema.optional().default('all'),
  findHome: z.boolean().optional().default(false),
});

export const farmbotMoveSchema = farmbotConfirmSchema.extend({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  speed: z.number().positive().max(100).optional().default(100),
});

export const farmbotPlantStageSchema = z.enum([
  'planned',
  'planted',
  'sprouted',
  'harvested',
]);

export const createFarmbotPlantPointSchema = z.object({
  name: z.string().min(1).max(200),
  x: z.number(),
  y: z.number(),
  z: z.number().optional().default(0),
  radius: z.number().positive().optional().default(25),
  plant_stage: farmbotPlantStageSchema.optional().default('planned'),
  planted_at: z.string().optional().nullable(),
  openfarm_slug: z.string().max(200).optional().nullable(),
});

export const updateFarmbotPlantPointSchema = createFarmbotPlantPointSchema.partial();

export const normalizeItemName = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, ' ');

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
