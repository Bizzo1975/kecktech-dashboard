const { body, validationResult } = require('express-validator');
const { BaseController } = require('./base.controller');
const priceComparisonService = require('../services/price-comparison.service');

class PriceComparisonController extends BaseController {
  /**
   * Compare prices for a specific item across different stores
   */
  async compareItemPrices(req, res) {
    try {
      const { itemId } = req.params;
      const comparison = await priceComparisonService.compareItemPrices(itemId);
      return this.success(res, comparison);
    } catch (error) {
      return this.error(res, error);
    }
  }

  /**
   * Get price history for a specific item
   */
  async getPriceHistory(req, res) {
    try {
      const { itemId } = req.params;
      const { days } = req.query;
      const history = await priceComparisonService.getPriceHistory(itemId, parseInt(days));
      return this.success(res, history);
    } catch (error) {
      return this.error(res, error);
    }
  }

  /**
   * Find the best deals across all items
   */
  async findBestDeals(req, res) {
    try {
      const { category, limit, minDiscount } = req.query;
      const deals = await priceComparisonService.findBestDeals({
        category,
        limit: parseInt(limit),
        minDiscount: parseFloat(minDiscount)
      });
      return this.success(res, { deals });
    } catch (error) {
      return this.error(res, error);
    }
  }

  /**
   * Update price for an item at a specific store
   */
  async updatePrice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.error(res, { errors: errors.array() });
      }

      const { itemId, storeId } = req.params;
      const { price } = req.body;

      await priceComparisonService.trackPriceChange(itemId, storeId, price);
      return this.success(res, { message: 'Price updated successfully' });
    } catch (error) {
      return this.error(res, error);
    }
  }
}

// Validation middleware
const validatePriceUpdate = [
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
];

const priceComparisonController = new PriceComparisonController();

module.exports = {
  priceComparisonController,
  validatePriceUpdate
}; 