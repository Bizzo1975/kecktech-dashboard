const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const priceComparisonController = require('../controllers/priceComparison.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware
const priceUpdateValidation = [
  body('store').isIn(['walmart', 'sams_club', 'target', 'dillions', 'leekers']),
  body('price').isFloat({ min: 0 }),
  body('unit').trim().notEmpty(),
  body('url').optional().isURL(),
  body('lastChecked').optional().isISO8601()
];

// Public routes
router.get('/stores', priceComparisonController.getSupportedStores);
router.get('/items/:id', priceComparisonController.getItemPrices);
router.get('/items/:id/history', priceComparisonController.getPriceHistory);

// Protected routes
router.use(authMiddleware);

// Price updates
router.post('/items/:id/prices', priceUpdateValidation, priceComparisonController.updatePrice);
router.post('/items/:id/prices/bulk', [
  body('prices').isArray(),
  body('prices.*.store').isIn(['walmart', 'sams_club', 'target', 'dillions', 'leekers']),
  body('prices.*.price').isFloat({ min: 0 }),
  body('prices.*.unit').trim().notEmpty()
], priceComparisonController.updateBulkPrices);

// Price alerts
router.post('/alerts', [
  body('groceryItemId').isUUID(),
  body('targetPrice').isFloat({ min: 0 }),
  body('store').optional().isIn(['walmart', 'sams_club', 'target', 'dillions', 'leekers'])
], priceComparisonController.createPriceAlert);
router.get('/alerts', priceComparisonController.getPriceAlerts);
router.delete('/alerts/:id', priceComparisonController.deletePriceAlert);

// Analytics
router.get('/analytics/trends', priceComparisonController.getPriceTrends);
router.get('/analytics/best-deals', priceComparisonController.getBestDeals);
router.get('/analytics/store-comparison', priceComparisonController.getStoreComparison);

module.exports = router; 