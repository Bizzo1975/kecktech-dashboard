import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as auth from '../controllers/auth.controller';
import * as household from '../controllers/household.controller';
import * as lists from '../controllers/list.controller';
import * as misc from '../controllers/misc.controller';
import * as nutrition from '../controllers/nutrition.controller';
import * as garden from '../controllers/garden.controller';
import * as farmbot from '../controllers/farmbot.controller';
import { sequelize } from '../models';

const asyncHandler =
  (fn: (req: never, res: never) => Promise<unknown>) =>
  (req: unknown, res: unknown, next: (err?: unknown) => void) =>
    Promise.resolve(fn(req as never, res as never)).catch(next);

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      success: true,
      data: { status: 'ok', db: 'up', version: '1.0.0', product: 'Marketlist' },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: { message: 'Database unavailable', code: 'DB_DOWN' },
      data: { status: 'degraded', db: 'down', version: '1.0.0', product: 'Marketlist' },
    });
  }
});

router.post('/auth/register', ...auth.registerValidators, asyncHandler(auth.register));
router.post('/auth/login', ...auth.loginValidators, asyncHandler(auth.login));
router.post('/auth/refresh', ...auth.refreshValidators, asyncHandler(auth.refresh));
router.post('/auth/forgot-password', ...auth.forgotPasswordValidators, asyncHandler(auth.forgotPassword));
router.post('/auth/reset-password', ...auth.resetPasswordValidators, asyncHandler(auth.resetPassword));
router.post('/auth/logout', requireAuth, asyncHandler(auth.logout));
router.get('/auth/me', requireAuth, asyncHandler(auth.me));
router.delete('/auth/me', requireAuth, asyncHandler(auth.deleteAccount));
router.delete('/me', requireAuth, asyncHandler(auth.deleteAccount));
router.put('/auth/password', requireAuth, ...auth.passwordValidators, asyncHandler(auth.changePassword));
router.patch(
  '/me/preferences',
  requireAuth,
  ...auth.preferencesValidators,
  asyncHandler(auth.updatePreferences),
);
router.post(
  '/me/push-token',
  requireAuth,
  ...auth.pushTokenValidators,
  asyncHandler(auth.savePushToken),
);

router.get('/households', requireAuth, asyncHandler(household.listHouseholds));
router.post('/households', requireAuth, ...household.createHouseholdValidators, asyncHandler(household.createHousehold));
router.post('/households/join', requireAuth, ...household.joinHouseholdValidators, asyncHandler(household.joinHousehold));
router.get('/households/:id/members', requireAuth, asyncHandler(household.listMembers));
router.patch(
  '/households/:id',
  requireAuth,
  ...household.updateHouseholdValidators,
  asyncHandler(household.updateHousehold),
);
router.post('/households/:id/leave', requireAuth, asyncHandler(household.leaveHousehold));
router.delete('/households/:id/members/:userId', requireAuth, asyncHandler(household.removeMember));
router.post('/households/:id/bootstrap', requireAuth, asyncHandler(household.bootstrapHousehold));

router.get('/items/suggest', requireAuth, asyncHandler(lists.suggestItems));

router.get('/lists', requireAuth, asyncHandler(lists.listLists));
router.post('/lists', requireAuth, ...lists.createListValidators, asyncHandler(lists.createList));
router.get('/lists/:id', requireAuth, asyncHandler(lists.getList));
router.put('/lists/:id', requireAuth, ...lists.updateListValidators, asyncHandler(lists.updateList));
router.delete('/lists/:id', requireAuth, asyncHandler(lists.deleteList));
router.post('/lists/:id/copy', requireAuth, ...lists.copyListValidators, asyncHandler(lists.copyList));
router.post('/lists/:id/complete', requireAuth, ...lists.completeTripValidators, asyncHandler(lists.completeTrip));
router.get('/lists/:id/estimate', requireAuth, asyncHandler(lists.estimateListBasket));
router.post('/lists/:id/items', requireAuth, ...lists.createItemValidators, asyncHandler(lists.addListItem));
router.put('/lists/:listId/items/:itemId', requireAuth, ...lists.updateItemValidators, asyncHandler(lists.updateListItem));
router.delete('/lists/:listId/items/:itemId', requireAuth, asyncHandler(lists.deleteListItem));

router.get('/pantry', requireAuth, asyncHandler(lists.listPantry));
router.post('/pantry', requireAuth, ...lists.createPantryValidators, asyncHandler(lists.createPantryItem));
router.put('/pantry/:id', requireAuth, ...lists.updatePantryValidators, asyncHandler(lists.updatePantryItem));
router.delete('/pantry/:id', requireAuth, asyncHandler(lists.deletePantryItem));
router.post('/pantry/:id/add-to-list', requireAuth, ...lists.addToListValidators, asyncHandler(lists.addPantryToList));

router.get('/catalog/items', requireAuth, asyncHandler(misc.listCatalog));
router.post('/catalog/items', requireAuth, ...misc.catalogValidators, asyncHandler(misc.createCatalogItem));

router.post('/recipes/parse', requireAuth, ...misc.parseValidators, asyncHandler(misc.parseRecipe));
router.get('/recipes/suggestions', requireAuth, asyncHandler(misc.recipeSuggestions));
router.get('/recipes/suggestions/expiring', requireAuth, asyncHandler(misc.recipeSuggestionsExpiring));
router.get('/recipes', requireAuth, asyncHandler(misc.listRecipes));
router.post('/recipes', requireAuth, asyncHandler(misc.createRecipe));
router.get('/recipes/:id', requireAuth, asyncHandler(misc.getRecipe));
router.put('/recipes/:id', requireAuth, ...misc.updateRecipeValidators, asyncHandler(misc.updateRecipe));
router.delete('/recipes/:id', requireAuth, asyncHandler(misc.deleteRecipe));

router.get('/meal-plans', requireAuth, asyncHandler(misc.listMealPlans));
router.post('/meal-plans', requireAuth, ...misc.createMealPlanValidators, asyncHandler(misc.createMealPlan));
router.put(
  '/meal-plans/:id',
  requireAuth,
  ...nutrition.updateMealPlanValidators,
  asyncHandler(nutrition.updateMealPlan),
);
router.delete('/meal-plans/:id', requireAuth, asyncHandler(misc.deleteMealPlan));
router.post(
  '/meal-plans/generate-list',
  requireAuth,
  ...misc.generateMealListValidators,
  asyncHandler(misc.generateListFromMealPlans),
);

router.post('/meal-logs', requireAuth, ...nutrition.createMealLogValidators, asyncHandler(nutrition.createMealLog));
router.get('/meal-logs', requireAuth, asyncHandler(nutrition.listMealLogs));
router.get('/nutrition/day', requireAuth, asyncHandler(nutrition.nutritionDayInsight));
router.get('/nutrition/week', requireAuth, asyncHandler(nutrition.nutritionWeekInsight));
router.get('/nutrition/profiles', requireAuth, asyncHandler(nutrition.listNutritionProfiles));
router.get('/recipes/:id/nutrition', requireAuth, asyncHandler(nutrition.getRecipeNutrition));

router.get('/prices/stores', requireAuth, asyncHandler(misc.listStores));
router.post('/prices/stores', requireAuth, ...misc.storeValidators, asyncHandler(misc.createStore));
router.put('/prices/items/:itemName/stores/:storeId', requireAuth, asyncHandler(misc.upsertPriceByPath));
router.post('/prices', requireAuth, ...misc.priceValidators, asyncHandler(misc.upsertPrice));
router.get('/prices/items/:itemName/history', requireAuth, asyncHandler(misc.priceHistory));
router.get('/prices/deals', requireAuth, asyncHandler(misc.bestDeals));

router.get('/insights/spending', requireAuth, asyncHandler(misc.spendingInsights));
router.get('/insights/restock', requireAuth, asyncHandler(misc.restockInsights));

router.post('/capture/barcode', requireAuth, asyncHandler(misc.barcodeLookup));
router.post('/capture/ocr', requireAuth, ...misc.ocrValidators, asyncHandler(misc.receiptOcr));
router.post('/capture/review', requireAuth, ...misc.reviewLinesValidators, asyncHandler(misc.reviewCaptureLines));
router.get('/me/export', requireAuth, asyncHandler(misc.exportMyData));

router.get('/garden-sources', requireAuth, asyncHandler(garden.listGardenSources));
router.post(
  '/garden-sources',
  requireAuth,
  ...garden.createSourceValidators,
  asyncHandler(garden.createGardenSource),
);
router.patch(
  '/garden-sources/:id',
  requireAuth,
  ...garden.updateSourceValidators,
  asyncHandler(garden.updateGardenSource),
);
router.delete('/garden-sources/:id', requireAuth, asyncHandler(garden.deleteGardenSource));
router.post('/garden-sources/:id/sync', requireAuth, asyncHandler(garden.syncGardenSource));

router.get('/garden-yields', requireAuth, asyncHandler(garden.listGardenYields));
router.post(
  '/garden-yields',
  requireAuth,
  ...garden.createYieldValidators,
  asyncHandler(garden.createGardenYield),
);
router.patch(
  '/garden-yields/:id',
  requireAuth,
  ...garden.updateYieldValidators,
  asyncHandler(garden.updateGardenYield),
);
router.delete('/garden-yields/:id', requireAuth, asyncHandler(garden.deleteGardenYield));
router.post(
  '/garden-yields/:id/harvest',
  requireAuth,
  ...garden.harvestValidators,
  asyncHandler(garden.harvestGardenYield),
);

router.get(
  '/garden-sources/:id/farmbot/status',
  requireAuth,
  asyncHandler(farmbot.getFarmBotStatus),
);
router.get(
  '/garden-sources/:id/farmbot/device',
  requireAuth,
  asyncHandler(farmbot.getFarmBotDevice),
);
router.get(
  '/garden-sources/:id/farmbot/sequences',
  requireAuth,
  asyncHandler(farmbot.listFarmBotSequences),
);
router.post(
  '/garden-sources/:id/farmbot/sequences/:sequenceId/exec',
  requireAuth,
  ...farmbot.confirmValidators,
  asyncHandler(farmbot.execFarmBotSequence),
);
router.get(
  '/garden-sources/:id/farmbot/regimens',
  requireAuth,
  asyncHandler(farmbot.listFarmBotRegimens),
);
router.get(
  '/garden-sources/:id/farmbot/farm-events',
  requireAuth,
  asyncHandler(farmbot.listFarmBotFarmEvents),
);
router.get(
  '/garden-sources/:id/farmbot/peripherals',
  requireAuth,
  asyncHandler(farmbot.listFarmBotPeripherals),
);
router.post(
  '/garden-sources/:id/farmbot/peripherals/:pinId/toggle',
  requireAuth,
  ...farmbot.confirmValidators,
  asyncHandler(farmbot.toggleFarmBotPeripheral),
);
router.get(
  '/garden-sources/:id/farmbot/tools',
  requireAuth,
  asyncHandler(farmbot.listFarmBotTools),
);
router.get(
  '/garden-sources/:id/farmbot/images',
  requireAuth,
  asyncHandler(farmbot.listFarmBotImages),
);
router.post(
  '/garden-sources/:id/farmbot/photos/take',
  requireAuth,
  ...farmbot.confirmValidators,
  asyncHandler(farmbot.takeFarmBotPhoto),
);
router.get(
  '/garden-sources/:id/farmbot/logs',
  requireAuth,
  asyncHandler(farmbot.listFarmBotLogs),
);
router.post(
  '/garden-sources/:id/farmbot/estop',
  requireAuth,
  ...farmbot.confirmValidators,
  asyncHandler(farmbot.farmBotEstop),
);
router.post(
  '/garden-sources/:id/farmbot/unlock',
  requireAuth,
  ...farmbot.confirmValidators,
  asyncHandler(farmbot.farmBotUnlock),
);
router.post(
  '/garden-sources/:id/farmbot/home',
  requireAuth,
  ...farmbot.homeValidators,
  asyncHandler(farmbot.farmBotHome),
);
router.post(
  '/garden-sources/:id/farmbot/move',
  requireAuth,
  ...farmbot.moveValidators,
  asyncHandler(farmbot.farmBotMove),
);
router.post(
  '/garden-sources/:id/farmbot/sync',
  requireAuth,
  ...farmbot.confirmValidators,
  asyncHandler(farmbot.farmBotDeviceSync),
);
router.post(
  '/garden-sources/:id/farmbot/points',
  requireAuth,
  ...farmbot.createPointValidators,
  asyncHandler(farmbot.createFarmBotPoint),
);
router.patch(
  '/garden-sources/:id/farmbot/points/:pointId',
  requireAuth,
  ...farmbot.updatePointValidators,
  asyncHandler(farmbot.updateFarmBotPoint),
);
router.delete(
  '/garden-sources/:id/farmbot/points/:pointId',
  requireAuth,
  asyncHandler(farmbot.deleteFarmBotPoint),
);

export default router;
