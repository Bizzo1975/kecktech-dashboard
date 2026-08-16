const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const mealPlanController = require('../controllers/mealPlan.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware
const mealPlanValidation = [
  body('recipeId').isUUID(),
  body('date').isISO8601(),
  body('mealType').isIn(['breakfast', 'lunch', 'dinner', 'snack']),
  body('servings').isInt({ min: 1 }),
  body('notes').optional().trim().escape()
];

const weeklyPlanValidation = [
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('meals').isArray(),
  body('meals.*.recipeId').isUUID(),
  body('meals.*.date').isISO8601(),
  body('meals.*.mealType').isIn(['breakfast', 'lunch', 'dinner', 'snack']),
  body('meals.*.servings').isInt({ min: 1 })
];

// All routes require authentication
router.use(authMiddleware);

// Single meal plan
router.get('/', mealPlanController.getMealPlans);
router.post('/', mealPlanValidation, mealPlanController.createMealPlan);
router.get('/:id', mealPlanController.getMealPlanById);
router.put('/:id', mealPlanValidation, mealPlanController.updateMealPlan);
router.delete('/:id', mealPlanController.deleteMealPlan);

// Weekly meal planning
router.get('/weekly/:startDate', mealPlanController.getWeeklyPlan);
router.post('/weekly', weeklyPlanValidation, mealPlanController.createWeeklyPlan);
router.put('/weekly/:startDate', weeklyPlanValidation, mealPlanController.updateWeeklyPlan);
router.delete('/weekly/:startDate', mealPlanController.deleteWeeklyPlan);

// Meal plan suggestions
router.get('/suggestions', mealPlanController.getMealSuggestions);
router.post('/generate-shopping-list', mealPlanController.generateShoppingList);

// Meal plan analytics
router.get('/analytics/nutrition', mealPlanController.getNutritionalAnalytics);
router.get('/analytics/cost', mealPlanController.getCostAnalytics);

module.exports = router; 