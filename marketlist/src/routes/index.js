const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const recipeRoutes = require('./recipe.routes');
const groceryRoutes = require('./grocery.routes');
const pantryRoutes = require('./pantry.routes');
const mealPlanRoutes = require('./mealPlan.routes');
const priceComparisonRoutes = require('./priceComparison.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/recipes', recipeRoutes);
router.use('/grocery', groceryRoutes);
router.use('/pantry', pantryRoutes);
router.use('/meal-plan', mealPlanRoutes);
router.use('/price-comparison', priceComparisonRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

module.exports = router; 