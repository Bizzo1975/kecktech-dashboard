const { Op } = require('sequelize');
const { Recipe, RecipeIngredient, GroceryItem, PantryItem } = require('../models');

class RecipeSuggestionService {
  /**
   * Get recipe suggestions based on pantry items
   * @param {number} userId - The user ID
   * @param {Object} options - Additional options for filtering suggestions
   * @returns {Promise<Array>} - Array of suggested recipes with match percentages
   */
  async getRecipeSuggestions(userId, options = {}) {
    try {
      // Get user's pantry items
      const pantryItems = await PantryItem.findAll({
        where: { userId },
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category']
        }]
      });

      if (!pantryItems.length) {
        return [];
      }

      // Extract grocery item IDs from pantry items
      const pantryItemIds = pantryItems.map(item => item.groceryItemId);

      // Get all recipes that use at least one of the pantry items
      const recipes = await Recipe.findAll({
        include: [
          {
            model: GroceryItem,
            through: { attributes: ['quantity', 'unit', 'optional'] }
          }
        ],
        where: options.filters || {}
      });

      // Calculate match percentage for each recipe
      const suggestions = recipes.map(recipe => {
        const matchDetails = this.calculateRecipeMatch(recipe, pantryItems);
        return {
          recipe,
          matchPercentage: matchDetails.matchPercentage,
          missingIngredients: matchDetails.missingIngredients,
          availableIngredients: matchDetails.availableIngredients,
          canMake: matchDetails.canMake
        };
      });

      // Sort by match percentage (highest first) and filter out very low matches
      return suggestions
        .filter(suggestion => suggestion.matchPercentage >= (options.minMatchPercentage || 30))
        .sort((a, b) => b.matchPercentage - a.matchPercentage);
    } catch (error) {
      console.error('Error getting recipe suggestions:', error);
      throw error;
    }
  }

  /**
   * Calculate how well a recipe matches available pantry items
   * @param {Object} recipe - The recipe to evaluate
   * @param {Array} pantryItems - Array of user's pantry items
   * @returns {Object} - Match details including percentage and missing ingredients
   */
  calculateRecipeMatch(recipe, pantryItems) {
    // Create a map of pantry items for quick lookup
    const pantryMap = new Map();
    pantryItems.forEach(item => {
      pantryMap.set(item.groceryItemId, item);
    });

    // Track ingredients
    const missingIngredients = [];
    const availableIngredients = [];
    let totalIngredients = 0;
    let matchedIngredients = 0;

    // Evaluate each recipe ingredient
    recipe.GroceryItems.forEach(recipeIngredient => {
      const pantryItem = pantryMap.get(recipeIngredient.id);
      const recipeIngredientData = recipeIngredient.RecipeIngredient;
      
      totalIngredients++;
      
      if (pantryItem) {
        // Check if we have enough quantity
        const hasEnough = this.checkQuantityMatch(
          pantryItem.quantity,
          pantryItem.unit,
          recipeIngredientData.quantity,
          recipeIngredientData.unit
        );

        if (hasEnough) {
          matchedIngredients++;
          availableIngredients.push({
            ingredient: recipeIngredient,
            quantity: recipeIngredientData.quantity,
            unit: recipeIngredientData.unit
          });
        } else {
          missingIngredients.push({
            ingredient: recipeIngredient,
            quantity: recipeIngredientData.quantity,
            unit: recipeIngredientData.unit,
            reason: 'insufficient_quantity'
          });
        }
      } else if (recipeIngredientData.optional) {
        // Optional ingredients don't count against the match
        matchedIngredients++;
      } else {
        missingIngredients.push({
          ingredient: recipeIngredient,
          quantity: recipeIngredientData.quantity,
          unit: recipeIngredientData.unit,
          reason: 'missing'
        });
      }
    });

    // Calculate match percentage
    const matchPercentage = Math.round((matchedIngredients / totalIngredients) * 100);
    
    // Determine if the recipe can be made (all required ingredients are available)
    const canMake = missingIngredients.every(item => 
      item.reason === 'insufficient_quantity' || 
      recipe.GroceryItems.find(gi => gi.id === item.ingredient.id)?.RecipeIngredient.optional
    );

    return {
      matchPercentage,
      missingIngredients,
      availableIngredients,
      canMake
    };
  }

  /**
   * Check if pantry quantity is sufficient for recipe requirement
   * @param {number} pantryQuantity - Quantity in pantry
   * @param {string} pantryUnit - Unit in pantry
   * @param {number} recipeQuantity - Quantity required by recipe
   * @param {string} recipeUnit - Unit required by recipe
   * @returns {boolean} - Whether there's enough quantity
   */
  checkQuantityMatch(pantryQuantity, pantryUnit, recipeQuantity, recipeUnit) {
    // If units match, simple comparison
    if (pantryUnit === recipeUnit) {
      return pantryQuantity >= recipeQuantity;
    }

    // Convert units for comparison
    try {
      const convertedPantryQuantity = this.convertUnit(pantryQuantity, pantryUnit, recipeUnit);
      return convertedPantryQuantity >= recipeQuantity;
    } catch (error) {
      // If conversion fails, assume insufficient
      return false;
    }
  }

  /**
   * Convert between units of measurement
   * @param {number} value - Value to convert
   * @param {string} fromUnit - Source unit
   * @param {string} toUnit - Target unit
   * @returns {number} - Converted value
   */
  convertUnit(value, fromUnit, toUnit) {
    // Define conversion factors (to base units)
    const conversionFactors = {
      // Volume
      'ml': 1,
      'l': 1000,
      'cup': 236.588,
      'tbsp': 14.7868,
      'tsp': 4.92892,
      
      // Weight
      'g': 1,
      'kg': 1000,
      'oz': 28.3495,
      'lb': 453.592,
      
      // Count
      'piece': 1,
      'box': 1,
      'pack': 1,
      'bundle': 1
    };

    // Get base unit for each measurement type
    const getBaseUnit = (unit) => {
      if (['ml', 'l', 'cup', 'tbsp', 'tsp'].includes(unit)) return 'ml';
      if (['g', 'kg', 'oz', 'lb'].includes(unit)) return 'g';
      return 'piece';
    };

    // Get base units
    const fromBaseUnit = getBaseUnit(fromUnit);
    const toBaseUnit = getBaseUnit(toUnit);

    // If base units are different, conversion is not possible
    if (fromBaseUnit !== toBaseUnit) {
      throw new Error(`Cannot convert between ${fromUnit} and ${toUnit}`);
    }

    // Convert to base unit then to target unit
    const baseValue = value * conversionFactors[fromUnit];
    return baseValue / conversionFactors[toUnit];
  }

  /**
   * Get recipe suggestions based on expiring items
   * @param {number} userId - The user ID
   * @param {number} daysThreshold - Number of days until expiration
   * @returns {Promise<Array>} - Array of suggested recipes
   */
  async getSuggestionsForExpiringItems(userId, daysThreshold = 7) {
    try {
      // Get items that are expiring soon
      const expiringItems = await PantryItem.findAll({
        where: {
          userId,
          expirationDate: {
            [Op.not]: null,
            [Op.between]: [
              new Date(),
              new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000)
            ]
          }
        },
        include: [{
          model: GroceryItem,
          attributes: ['id', 'name', 'category']
        }]
      });

      if (!expiringItems.length) {
        return [];
      }

      // Get recipe suggestions for these items
      return this.getRecipeSuggestions(userId, {
        filters: {
          '$GroceryItems.id$': {
            [Op.in]: expiringItems.map(item => item.groceryItemId)
          }
        },
        minMatchPercentage: 50 // Higher threshold for expiring items
      });
    } catch (error) {
      console.error('Error getting suggestions for expiring items:', error);
      throw error;
    }
  }

  /**
   * Get recipe suggestions based on dietary preferences
   * @param {number} userId - The user ID
   * @param {Object} dietaryPreferences - User's dietary preferences
   * @returns {Promise<Array>} - Array of suggested recipes
   */
  async getSuggestionsByDietaryPreferences(userId, dietaryPreferences) {
    try {
      // Build filters based on dietary preferences
      const filters = {};
      
      if (dietaryPreferences.vegetarian) {
        filters.isVegetarian = true;
      }
      
      if (dietaryPreferences.vegan) {
        filters.isVegan = true;
      }
      
      if (dietaryPreferences.glutenFree) {
        filters.isGlutenFree = true;
      }
      
      if (dietaryPreferences.maxCalories) {
        filters.calories = {
          [Op.lte]: dietaryPreferences.maxCalories
        };
      }

      // Get recipe suggestions with dietary filters
      return this.getRecipeSuggestions(userId, {
        filters,
        minMatchPercentage: 40
      });
    } catch (error) {
      console.error('Error getting suggestions by dietary preferences:', error);
      throw error;
    }
  }
}

module.exports = new RecipeSuggestionService(); 