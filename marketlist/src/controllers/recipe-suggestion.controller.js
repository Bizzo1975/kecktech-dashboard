const { body, validationResult } = require('express-validator');
const { BaseController } = require('./base.controller');
const { GroceryItem, GroceryList, GroceryListItem } = require('../models');
const { Op } = require('sequelize');

class RecipeSuggestionController extends BaseController {
  /**
   * Get recipe suggestions based on pantry items
   */
  async getRecipeSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { minMatchPercentage = 50, category, limit = 10 } = req.query;

      // Get user's pantry items
      const pantryItems = await GroceryListItem.findAll({
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category']
        }],
        where: {
          listId: {
            [Op.in]: await GroceryList.findAll({
              where: { userId, type: 'pantry' },
              attributes: ['id']
            }).then(lists => lists.map(list => list.id))
          }
        }
      });

      // TODO: Implement recipe matching algorithm
      // This would typically involve:
      // 1. Getting recipes from a recipe database/API
      // 2. Matching ingredients with pantry items
      // 3. Calculating match percentage
      // 4. Filtering by category if specified
      // 5. Sorting by match percentage
      // 6. Limiting results

      const suggestions = []; // Placeholder for actual implementation

      return this.success(res, {
        suggestions,
        total: suggestions.length
      });
    } catch (error) {
      return this.error(res, error);
    }
  }

  /**
   * Get recipe suggestions for expiring items
   */
  async getSuggestionsForExpiringItems(req, res) {
    try {
      const userId = req.user.id;
      const { daysThreshold = 7, limit = 10 } = req.query;

      // Get items nearing expiration
      const expiringItems = await GroceryListItem.findAll({
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category']
        }],
        where: {
          listId: {
            [Op.in]: await GroceryList.findAll({
              where: { userId, type: 'pantry' },
              attributes: ['id']
            }).then(lists => lists.map(list => list.id))
          },
          expiryDate: {
            [Op.between]: [new Date(), new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000)]
          }
        }
      });

      // TODO: Implement recipe matching for expiring items
      // Similar to getRecipeSuggestions but prioritizing recipes that use expiring items

      const suggestions = []; // Placeholder for actual implementation

      return this.success(res, {
        suggestions,
        expiringItems: expiringItems.map(item => ({
          id: item.GroceryItem.id,
          name: item.GroceryItem.name,
          category: item.GroceryItem.category,
          expiryDate: item.expiryDate
        }))
      });
    } catch (error) {
      return this.error(res, error);
    }
  }

  /**
   * Get recipe suggestions based on dietary preferences
   */
  async getSuggestionsByDietaryPreferences(req, res) {
    try {
      const userId = req.user.id;
      const { vegetarian, vegan, glutenFree, maxCalories, limit = 10 } = req.body;

      // TODO: Implement recipe matching with dietary preferences
      // This would typically involve:
      // 1. Getting recipes from a recipe database/API
      // 2. Filtering recipes based on dietary preferences
      // 3. Matching with pantry items
      // 4. Sorting by match percentage
      // 5. Limiting results

      const suggestions = []; // Placeholder for actual implementation

      return this.success(res, {
        suggestions,
        total: suggestions.length
      });
    } catch (error) {
      return this.error(res, error);
    }
  }
}

// Validation middleware for dietary preferences
const validateDietaryPreferences = [
  body('vegetarian').optional().isBoolean(),
  body('vegan').optional().isBoolean(),
  body('glutenFree').optional().isBoolean(),
  body('maxCalories').optional().isInt({ min: 0 }),
  body('limit').optional().isInt({ min: 1, max: 50 })
];

const recipeSuggestionController = new RecipeSuggestionController();

module.exports = {
  recipeSuggestionController,
  validateDietaryPreferences
}; 