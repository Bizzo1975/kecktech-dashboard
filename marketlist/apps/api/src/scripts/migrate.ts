import { Umzug, SequelizeStorage } from 'umzug';
import { DataTypes } from 'sequelize';
import { sequelize, models } from '../models';

export const migrator = new Umzug({
  migrations: [
    {
      name: '001-init',
      async up() {
        await sequelize.sync({ force: false });
      },
      async down() {
        // no-op for initial
      },
    },
    {
      name: '002-item-memories',
      async up() {
        // Ensure newer models (e.g. ItemMemory) exist on already-migrated DBs
        await sequelize.sync({ alter: false });
      },
      async down() {
        await sequelize.getQueryInterface().dropTable('item_memories');
      },
    },
    {
      name: '003-budget-goal-and-sort-order',
      async up() {
        const qi = sequelize.getQueryInterface();
        const households = await qi.describeTable('households');
        if (!households.monthlyBudgetGoal) {
          await qi.addColumn('households', 'monthlyBudgetGoal', {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
          });
        }
        const listItems = await qi.describeTable('list_items');
        if (!listItems.sortOrder) {
          await qi.addColumn('list_items', 'sortOrder', {
            type: DataTypes.INTEGER,
            allowNull: true,
          });
        }
      },
      async down() {
        const qi = sequelize.getQueryInterface();
        const households = await qi.describeTable('households');
        if (households.monthlyBudgetGoal) {
          await qi.removeColumn('households', 'monthlyBudgetGoal');
        }
        const listItems = await qi.describeTable('list_items');
        if (listItems.sortOrder) {
          await qi.removeColumn('list_items', 'sortOrder');
        }
      },
    },
    {
      name: '004-password-reset-tokens',
      async up() {
        const qi = sequelize.getQueryInterface();
        const tables = await qi.showAllTables();
        const names = tables.map((t) => (typeof t === 'string' ? t : String((t as { tableName?: string }).tableName || t)));
        if (!names.includes('password_reset_tokens')) {
          await qi.createTable('password_reset_tokens', {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            userId: { type: DataTypes.UUID, allowNull: false },
            tokenHash: { type: DataTypes.STRING, allowNull: false },
            expiresAt: { type: DataTypes.DATE, allowNull: false },
            usedAt: { type: DataTypes.DATE, allowNull: true },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
          });
        }
      },
      async down() {
        const qi = sequelize.getQueryInterface();
        await qi.dropTable('password_reset_tokens');
      },
    },
    {
      name: '005-assignee-push-notification-prefs',
      async up() {
        const qi = sequelize.getQueryInterface();
        const listItems = await qi.describeTable('list_items');
        if (!listItems.assigneeUserId) {
          await qi.addColumn('list_items', 'assigneeUserId', {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          });
        }
        const users = await qi.describeTable('users');
        if (!users.pushToken) {
          await qi.addColumn('users', 'pushToken', {
            type: DataTypes.STRING(512),
            allowNull: true,
          });
        }
        if (!users.notificationPrefs) {
          await qi.addColumn('users', 'notificationPrefs', {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
          });
        }
      },
      async down() {
        const qi = sequelize.getQueryInterface();
        const listItems = await qi.describeTable('list_items');
        if (listItems.assigneeUserId) {
          await qi.removeColumn('list_items', 'assigneeUserId');
        }
        const users = await qi.describeTable('users');
        if (users.pushToken) {
          await qi.removeColumn('users', 'pushToken');
        }
        if (users.notificationPrefs) {
          await qi.removeColumn('users', 'notificationPrefs');
        }
      },
    },
    {
      name: '006-food-system-nutrition',
      async up() {
        const qi = sequelize.getQueryInterface();
        await sequelize.sync({ alter: false });

        const households = await qi.describeTable('households');
        for (const [col, def] of Object.entries({
          dailyCalorieGoal: { type: DataTypes.INTEGER, allowNull: true },
          proteinGoalG: { type: DataTypes.FLOAT, allowNull: true },
          carbGoalG: { type: DataTypes.FLOAT, allowNull: true },
          fatGoalG: { type: DataTypes.FLOAT, allowNull: true },
        })) {
          if (!households[col]) await qi.addColumn('households', col, def as never);
        }

        const recipes = await qi.describeTable('recipes');
        if (!recipes.servings) {
          await qi.addColumn('recipes', 'servings', {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 4,
          });
        }

        const recipeIngredients = await qi.describeTable('recipe_ingredients');
        if (!recipeIngredients.nutritionProfileId) {
          await qi.addColumn('recipe_ingredients', 'nutritionProfileId', {
            type: DataTypes.UUID,
            allowNull: true,
          });
        }

        try {
          const pantry = await qi.describeTable('pantry_items');
          if (!pantry.gtin) {
            await qi.addColumn('pantry_items', 'gtin', { type: DataTypes.STRING(32), allowNull: true });
          }
        } catch {
          /* table may lag sync */
        }

        try {
          const prices = await qi.describeTable('price_histories');
          if (!prices.gtin) {
            await qi.addColumn('price_histories', 'gtin', { type: DataTypes.STRING(32), allowNull: true });
          }
        } catch {
          /* ignore */
        }

        try {
          const catalog = await qi.describeTable('catalog_items');
          if (!catalog.gtin) {
            await qi.addColumn('catalog_items', 'gtin', { type: DataTypes.STRING(32), allowNull: true });
          }
        } catch {
          /* ignore */
        }

        const { NutritionProfile } = await import('../models');
        const { USDA_SEED_PROFILES } = await import('../services/nutrition');
        for (const seed of USDA_SEED_PROFILES) {
          const existing = await NutritionProfile.findOne({
            where: { canonicalName: seed.canonicalName, source: 'usda_seed', householdId: null },
          });
          if (existing) continue;
          await NutritionProfile.create({
            name: seed.name,
            canonicalName: seed.canonicalName,
            gtin: null,
            householdId: null,
            kcalPer100g: seed.kcalPer100g,
            proteinG: seed.proteinG,
            carbG: seed.carbG,
            fatG: seed.fatG,
            fiberG: seed.fiberG ?? null,
            sodiumMg: null,
            sugarG: null,
            source: 'usda_seed',
          });
        }
      },
      async down() {
        const qi = sequelize.getQueryInterface();
        await qi.dropTable('meal_logs');
        await qi.dropTable('nutrition_profiles');
      },
    },
    {
      name: '007-garden',
      async up() {
        const qi = sequelize.getQueryInterface();
        await sequelize.sync({ alter: false });

        const tables = await qi.showAllTables();
        const names = tables.map((t) =>
          typeof t === 'string' ? t : String((t as { tableName?: string }).tableName || t),
        );

        if (!names.includes('garden_sources')) {
          await qi.createTable('garden_sources', {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            householdId: { type: DataTypes.UUID, allowNull: false },
            type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'manual' },
            name: { type: DataTypes.STRING, allowNull: false },
            farmbotDeviceId: { type: DataTypes.STRING, allowNull: true },
            farmbotApiToken: { type: DataTypes.TEXT, allowNull: true },
            lastSyncedAt: { type: DataTypes.DATE, allowNull: true },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
          });
        } else {
          const cols = await qi.describeTable('garden_sources');
          if (!cols.lastSyncedAt) {
            await qi.addColumn('garden_sources', 'lastSyncedAt', {
              type: DataTypes.DATE,
              allowNull: true,
            });
          }
          // Prefer STRING over PG ENUM so indoor_tray does not require ALTER TYPE.
          if (cols.type && String(cols.type.type).toLowerCase().includes('enum')) {
            await sequelize.query(
              'ALTER TABLE garden_sources ALTER COLUMN type TYPE VARCHAR(32) USING type::text',
            );
          }
        }

        if (!names.includes('garden_yield_events')) {
          await qi.createTable('garden_yield_events', {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
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
            },
            farmbotPlantId: { type: DataTypes.STRING, allowNull: true },
            harvestedPantryItemId: { type: DataTypes.UUID, allowNull: true },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
          });
        }
      },
      async down() {
        const qi = sequelize.getQueryInterface();
        await qi.dropTable('garden_yield_events');
        await qi.dropTable('garden_sources');
      },
    },
  ],
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

export const runMigrations = async () => {
  void models;
  await migrator.up();
};
