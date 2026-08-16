import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';

export { sequelize };

export type NotificationPrefs = {
  notifyExpiring?: boolean;
  notifyTripReminder?: boolean;
};

type UserAttrs = {
  id: string;
  email: string;
  password: string;
  name: string;
  dietaryPrefs: string[] | null;
  pushToken: string | null;
  notificationPrefs: NotificationPrefs | null;
};

export class User
  extends Model<UserAttrs, Optional<UserAttrs, 'id' | 'dietaryPrefs' | 'pushToken' | 'notificationPrefs'>>
  implements UserAttrs
{
  declare id: string;
  declare email: string;
  declare password: string;
  declare name: string;
  declare dietaryPrefs: string[] | null;
  declare pushToken: string | null;
  declare notificationPrefs: NotificationPrefs | null;
  declare validatePassword: (password: string) => Promise<boolean>;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    dietaryPrefs: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    pushToken: { type: DataTypes.STRING(512), allowNull: true },
    notificationPrefs: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
  },
  {
    sequelize,
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        user.password = await bcrypt.hash(user.password, 10);
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  },
);

User.prototype.validatePassword = async function validatePassword(password: string) {
  return bcrypt.compare(password, this.password);
};

export class RefreshSession extends Model {
  declare id: string;
  declare userId: string;
  declare tokenHash: string;
  declare expiresAt: Date;
}

RefreshSession.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'refresh_sessions' },
);

export class PasswordResetToken extends Model {
  declare id: string;
  declare userId: string;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare usedAt: Date | null;
}

PasswordResetToken.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'password_reset_tokens' },
);

export class Household extends Model {
  declare id: string;
  declare name: string;
  declare inviteCode: string;
  declare monthlyBudgetGoal: number | null;
  declare dailyCalorieGoal: number | null;
  declare proteinGoalG: number | null;
  declare carbGoalG: number | null;
  declare fatGoalG: number | null;
}

Household.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    inviteCode: { type: DataTypes.STRING(12), allowNull: false, unique: true },
    monthlyBudgetGoal: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    dailyCalorieGoal: { type: DataTypes.INTEGER, allowNull: true },
    proteinGoalG: { type: DataTypes.FLOAT, allowNull: true },
    carbGoalG: { type: DataTypes.FLOAT, allowNull: true },
    fatGoalG: { type: DataTypes.FLOAT, allowNull: true },
  },
  { sequelize, tableName: 'households' },
);

export class HouseholdMember extends Model {
  declare id: string;
  declare householdId: string;
  declare userId: string;
  declare role: 'owner' | 'member';
  declare createdAt: Date;
  declare updatedAt: Date;
}

HouseholdMember.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    householdId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM('owner', 'member'), allowNull: false, defaultValue: 'member' },
  },
  { sequelize, tableName: 'household_members' },
);

export class GroceryList extends Model {
  declare id: string;
  declare householdId: string;
  declare name: string;
  declare sortMode: 'aisle' | 'category' | 'custom';
  declare type: string;
}

GroceryList.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    householdId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    sortMode: {
      type: DataTypes.ENUM('aisle', 'category', 'custom'),
      allowNull: false,
      defaultValue: 'aisle',
    },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'shopping' },
  },
  { sequelize, tableName: 'grocery_lists' },
);

export class ListItem extends Model {
  declare id: string;
  declare listId: string;
  declare name: string;
  declare category: string | null;
  declare aisleSection: string | null;
  declare quantity: number;
  declare unit: string | null;
  declare notes: string | null;
  declare checked: boolean;
  declare checkedAt: Date | null;
  declare createdBy: string | null;
  declare assigneeUserId: string | null;
  declare sortOrder: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ListItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    listId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    aisleSection: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    unit: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    checked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    checkedAt: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    assigneeUserId: { type: DataTypes.UUID, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: 'list_items' },
);

export class PantryItem extends Model {
  declare id: string;
  declare householdId: string;
  declare name: string;
  declare category: string | null;
  declare quantity: number;
  declare unit: string | null;
  declare expiryDate: Date | null;
  declare lowStockThreshold: number | null;
  declare gtin: string | null;
}

PantryItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    householdId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    unit: { type: DataTypes.STRING, allowNull: true },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
    lowStockThreshold: { type: DataTypes.FLOAT, allowNull: true },
    gtin: { type: DataTypes.STRING(32), allowNull: true },
  },
  { sequelize, tableName: 'pantry_items' },
);

export class CatalogItem extends Model {
  declare id: string;
  declare name: string;
  declare category: string | null;
  declare description: string | null;
  declare gtin: string | null;
}

CatalogItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    gtin: { type: DataTypes.STRING(32), allowNull: true },
  },
  { sequelize, tableName: 'catalog_items' },
);

export class Recipe extends Model {
  declare id: string;
  declare userId: string;
  declare householdId: string | null;
  declare name: string;
  declare instructions: string | null;
  declare category: string | null;
  declare servings: number;
}

Recipe.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    householdId: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    instructions: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: true },
    servings: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 4 },
  },
  { sequelize, tableName: 'recipes' },
);

export class RecipeIngredient extends Model {
  declare id: string;
  declare recipeId: string;
  declare name: string;
  declare quantity: number | null;
  declare unit: string | null;
  declare nutritionProfileId: string | null;
}

RecipeIngredient.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    recipeId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.FLOAT, allowNull: true },
    unit: { type: DataTypes.STRING, allowNull: true },
    nutritionProfileId: { type: DataTypes.UUID, allowNull: true },
  },
  { sequelize, tableName: 'recipe_ingredients' },
);

export class MealPlan extends Model {
  declare id: string;
  declare userId: string;
  declare householdId: string | null;
  declare recipeId: string | null;
  declare plannedDate: string;
  declare mealType: string;
  declare notes: string | null;
}

MealPlan.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    householdId: { type: DataTypes.UUID, allowNull: true },
    recipeId: { type: DataTypes.UUID, allowNull: true },
    plannedDate: { type: DataTypes.DATEONLY, allowNull: false },
    mealType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'dinner' },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'meal_plans' },
);

export class Store extends Model {
  declare id: string;
  declare name: string;
  declare householdId: string | null;
}

Store.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    householdId: { type: DataTypes.UUID, allowNull: true },
  },
  { sequelize, tableName: 'stores' },
);

export class PriceHistory extends Model {
  declare id: string;
  declare itemName: string;
  declare storeId: string;
  declare householdId: string | null;
  declare price: number;
  declare recordedAt: Date;
  declare category: string | null;
  declare gtin: string | null;
}

PriceHistory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    itemName: { type: DataTypes.STRING, allowNull: false },
    storeId: { type: DataTypes.UUID, allowNull: false },
    householdId: { type: DataTypes.UUID, allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    recordedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    category: { type: DataTypes.STRING, allowNull: true },
    gtin: { type: DataTypes.STRING(32), allowNull: true },
  },
  { sequelize, tableName: 'price_histories' },
);

export class NutritionProfile extends Model {
  declare id: string;
  declare name: string;
  declare canonicalName: string;
  declare gtin: string | null;
  declare householdId: string | null;
  declare kcalPer100g: number;
  declare proteinG: number;
  declare carbG: number;
  declare fatG: number;
  declare fiberG: number | null;
  declare sodiumMg: number | null;
  declare sugarG: number | null;
  declare source: 'off' | 'usda_seed' | 'manual' | 'estimate';
}

NutritionProfile.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    canonicalName: { type: DataTypes.STRING, allowNull: false },
    gtin: { type: DataTypes.STRING(32), allowNull: true },
    householdId: { type: DataTypes.UUID, allowNull: true },
    kcalPer100g: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    proteinG: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    carbG: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    fatG: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    fiberG: { type: DataTypes.FLOAT, allowNull: true },
    sodiumMg: { type: DataTypes.FLOAT, allowNull: true },
    sugarG: { type: DataTypes.FLOAT, allowNull: true },
    source: {
      type: DataTypes.ENUM('off', 'usda_seed', 'manual', 'estimate'),
      allowNull: false,
      defaultValue: 'estimate',
    },
  },
  { sequelize, tableName: 'nutrition_profiles' },
);

export class MealLog extends Model {
  declare id: string;
  declare userId: string;
  declare householdId: string;
  declare recipeId: string | null;
  declare mealPlanId: string | null;
  declare name: string;
  declare mealType: string;
  declare consumedAt: string;
  declare servingsEaten: number;
  declare kcal: number;
  declare proteinG: number;
  declare carbG: number;
  declare fatG: number;
  declare deductedPantry: boolean;
}

MealLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    householdId: { type: DataTypes.UUID, allowNull: false },
    recipeId: { type: DataTypes.UUID, allowNull: true },
    mealPlanId: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    mealType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'dinner' },
    consumedAt: { type: DataTypes.DATEONLY, allowNull: false },
    servingsEaten: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    kcal: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    proteinG: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    carbG: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    fatG: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    deductedPantry: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: 'meal_logs' },
);

export class ItemMemory extends Model {
  declare id: string;
  declare householdId: string;
  declare canonicalName: string;
  declare displayName: string;
  declare category: string | null;
  declare aisleSection: string | null;
  declare lastQuantity: number;
  declare lastUnit: string | null;
  declare useCount: number;
  declare lastUsedAt: Date;
}

ItemMemory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    householdId: { type: DataTypes.UUID, allowNull: false },
    canonicalName: { type: DataTypes.STRING, allowNull: false },
    displayName: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    aisleSection: { type: DataTypes.STRING, allowNull: true },
    lastQuantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    lastUnit: { type: DataTypes.STRING, allowNull: true },
    useCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    lastUsedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'item_memories' },
);

User.hasMany(RefreshSession, { foreignKey: 'userId' });
RefreshSession.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(PasswordResetToken, { foreignKey: 'userId' });
PasswordResetToken.belongsTo(User, { foreignKey: 'userId' });

Household.hasMany(HouseholdMember, { foreignKey: 'householdId', as: 'members' });
HouseholdMember.belongsTo(Household, { foreignKey: 'householdId' });
User.hasMany(HouseholdMember, { foreignKey: 'userId' });
HouseholdMember.belongsTo(User, { foreignKey: 'userId' });

Household.hasMany(GroceryList, { foreignKey: 'householdId', as: 'lists' });
GroceryList.belongsTo(Household, { foreignKey: 'householdId' });
GroceryList.hasMany(ListItem, { foreignKey: 'listId', as: 'items' });
ListItem.belongsTo(GroceryList, { foreignKey: 'listId' });
ListItem.belongsTo(User, { foreignKey: 'assigneeUserId', as: 'assignee' });
User.hasMany(ListItem, { foreignKey: 'assigneeUserId', as: 'assignedItems' });

Household.hasMany(PantryItem, { foreignKey: 'householdId', as: 'pantryItems' });
PantryItem.belongsTo(Household, { foreignKey: 'householdId' });

User.hasMany(Recipe, { foreignKey: 'userId' });
Recipe.belongsTo(User, { foreignKey: 'userId' });
Recipe.hasMany(RecipeIngredient, { foreignKey: 'recipeId', as: 'ingredients' });
RecipeIngredient.belongsTo(Recipe, { foreignKey: 'recipeId' });

User.hasMany(MealPlan, { foreignKey: 'userId' });
MealPlan.belongsTo(User, { foreignKey: 'userId' });
Recipe.hasMany(MealPlan, { foreignKey: 'recipeId' });
MealPlan.belongsTo(Recipe, { foreignKey: 'recipeId' });

Store.hasMany(PriceHistory, { foreignKey: 'storeId', as: 'prices' });
PriceHistory.belongsTo(Store, { foreignKey: 'storeId' });

Household.hasMany(ItemMemory, { foreignKey: 'householdId', as: 'itemMemories' });
ItemMemory.belongsTo(Household, { foreignKey: 'householdId' });

NutritionProfile.belongsTo(Household, { foreignKey: 'householdId' });
RecipeIngredient.belongsTo(NutritionProfile, { foreignKey: 'nutritionProfileId', as: 'nutrition' });
NutritionProfile.hasMany(RecipeIngredient, { foreignKey: 'nutritionProfileId' });

User.hasMany(MealLog, { foreignKey: 'userId' });
MealLog.belongsTo(User, { foreignKey: 'userId' });
Household.hasMany(MealLog, { foreignKey: 'householdId' });
MealLog.belongsTo(Household, { foreignKey: 'householdId' });
Recipe.hasMany(MealLog, { foreignKey: 'recipeId' });
MealLog.belongsTo(Recipe, { foreignKey: 'recipeId' });

export class GardenSource extends Model {
  declare id: string;
  declare householdId: string;
  declare type: 'manual' | 'farmbot' | 'indoor_tray';
  declare name: string;
  declare farmbotDeviceId: string | null;
  declare farmbotApiToken: string | null;
  declare lastSyncedAt: Date | null;
}

GardenSource.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    householdId: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'manual',
      validate: { isIn: [['manual', 'farmbot', 'indoor_tray']] },
    },
    name: { type: DataTypes.STRING, allowNull: false },
    farmbotDeviceId: { type: DataTypes.STRING, allowNull: true },
    // Encrypted at rest via services/tokenCrypto — never log; never return on GET.
    farmbotApiToken: { type: DataTypes.TEXT, allowNull: true },
    lastSyncedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'garden_sources' },
);

export class GardenYieldEvent extends Model {
  declare id: string;
  declare householdId: string;
  declare gardenSourceId: string;
  declare plantName: string;
  declare expectedHarvestStart: string | null;
  declare expectedHarvestEnd: string | null;
  declare estimatedYieldQty: number | null;
  declare estimatedYieldUnit: string | null;
  declare status: 'planted' | 'growing' | 'ready' | 'harvested';
  declare farmbotPlantId: string | null;
  declare harvestedPantryItemId: string | null;
}

GardenYieldEvent.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    householdId: { type: DataTypes.UUID, allowNull: false },
    gardenSourceId: { type: DataTypes.UUID, allowNull: false },
    plantName: { type: DataTypes.STRING, allowNull: false },
    expectedHarvestStart: { type: DataTypes.DATEONLY, allowNull: true },
    expectedHarvestEnd: { type: DataTypes.DATEONLY, allowNull: true },
    estimatedYieldQty: { type: DataTypes.FLOAT, allowNull: true },
    estimatedYieldUnit: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'planted',
      validate: { isIn: [['planted', 'growing', 'ready', 'harvested']] },
    },
    // FarmBot's own "plant" resource id, when this event was synced from the API — lets
    // repeat syncs update the same row instead of duplicating it.
    farmbotPlantId: { type: DataTypes.STRING, allowNull: true },
    // Set once harvested and converted into a PantryItem, so the UI can link back.
    harvestedPantryItemId: { type: DataTypes.UUID, allowNull: true },
  },
  { sequelize, tableName: 'garden_yield_events' },
);

Household.hasMany(GardenSource, { foreignKey: 'householdId', as: 'gardenSources' });
GardenSource.belongsTo(Household, { foreignKey: 'householdId' });
GardenSource.hasMany(GardenYieldEvent, { foreignKey: 'gardenSourceId', as: 'yieldEvents' });
GardenYieldEvent.belongsTo(GardenSource, { foreignKey: 'gardenSourceId' });
Household.hasMany(GardenYieldEvent, { foreignKey: 'householdId' });
GardenYieldEvent.belongsTo(Household, { foreignKey: 'householdId' });
GardenYieldEvent.belongsTo(PantryItem, { foreignKey: 'harvestedPantryItemId', as: 'pantryItem' });

export const models = {
  User,
  RefreshSession,
  PasswordResetToken,
  Household,
  HouseholdMember,
  GroceryList,
  ListItem,
  PantryItem,
  CatalogItem,
  Recipe,
  RecipeIngredient,
  MealPlan,
  Store,
  PriceHistory,
  ItemMemory,
  NutritionProfile,
  MealLog,
  GardenSource,
  GardenYieldEvent,
  sequelize,
};
