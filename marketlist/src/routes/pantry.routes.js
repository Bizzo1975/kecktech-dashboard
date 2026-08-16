const express = require('express');
const router = express.Router();
const pantryController = require('../controllers/pantry.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validatePantryItem, validateItemQuantity } = require('../validators/pantry.validator');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Pantry Items routes
router.get('/items', pantryController.getAllPantryItems);
router.get('/items/:id', pantryController.getPantryItemById);
router.post('/items', validatePantryItem, pantryController.createPantryItem);
router.put('/items/:id', validatePantryItem, pantryController.updatePantryItem);
router.delete('/items/:id', pantryController.deletePantryItem);
router.put('/items/:id/quantity', validateItemQuantity, pantryController.updateItemQuantity);

// Analytics routes
router.get('/analytics', pantryController.getPantryAnalytics);
router.get('/items/low-stock', pantryController.getLowStockItems);
router.get('/history', pantryController.getConsumptionHistory);
router.get('/suggestions', pantryController.getSuggestedItems);

module.exports = router; 