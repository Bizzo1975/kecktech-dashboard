const express = require('express');
const router = express.Router();
const { priceComparisonController, validatePriceUpdate } = require('../controllers/price-comparison.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

// Compare prices for a specific item
router.get(
  '/items/:itemId/prices',
  authenticate,
  priceComparisonController.compareItemPrices.bind(priceComparisonController)
);

// Get price history for a specific item
router.get(
  '/items/:itemId/price-history',
  authenticate,
  priceComparisonController.getPriceHistory.bind(priceComparisonController)
);

// Find best deals across all items
router.get(
  '/deals',
  authenticate,
  priceComparisonController.findBestDeals.bind(priceComparisonController)
);

// Update price for an item at a specific store
router.put(
  '/items/:itemId/stores/:storeId/price',
  authenticate,
  validatePriceUpdate,
  validate,
  priceComparisonController.updatePrice.bind(priceComparisonController)
);

module.exports = router; 