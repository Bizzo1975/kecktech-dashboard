const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const BaseController = require('./base.controller');
const { Recipe, GroceryItem, RecipeIngredient, User } = require('../models');

class RecipeController extends BaseController {
  // Get all recipes
  async getAllRecipes(req, res) {
    try {
      const { page = 1, limit = 10, search, tags, difficulty } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }
      if (tags) {
        where.tags = { [Op.overlap]: tags.split(',') };
      }
      if (difficulty) {
        where.difficulty = difficulty;
      }

      const recipes = await Recipe.findAndCountAll({
        where,
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return this.sendSuccess(res, {
        recipes: recipes.rows,
        total: recipes.count,
        page: parseInt(page),
        totalPages: Math.ceil(recipes.count / limit)
      });
    } catch (error) {
      return this.sendError(res, 'Error fetching recipes', 500, error.message);
    }
  }

  // Get recipe by ID
  async getRecipeById(req, res) {
    try {
      const recipe = await Recipe.findByPk(req.params.id, {
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'firstName', 'lastName']
          },
          {
            model: GroceryItem,
            through: { attributes: ['quantity', 'unit', 'notes', 'optional'] }
          }
        ]
      });

      if (!recipe) {
        return this.sendNotFound(res, 'Recipe not found');
      }

      return this.sendSuccess(res, { recipe });
    } catch (error) {
      return this.sendError(res, 'Error fetching recipe', 500, error.message);
    }
  }

  // Search recipes
  async searchRecipes(req, res) {
    try {
      const { query, tags, difficulty, prepTime, cookTime } = req.query;
      const where = {};

      if (query) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } }
        ];
      }
      if (tags) {
        where.tags = { [Op.overlap]: tags.split(',') };
      }
      if (difficulty) {
        where.difficulty = difficulty;
      }
      if (prepTime) {
        where.prepTime = { [Op.lte]: prepTime };
      }
      if (cookTime) {
        where.cookTime = { [Op.lte]: cookTime };
      }

      const recipes = await Recipe.findAll({
        where,
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return this.sendSuccess(res, { recipes });
    } catch (error) {
      return this.sendError(res, 'Error searching recipes', 500, error.message);
    }
  }

  // Create recipe
  async createRecipe(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const recipe = await Recipe.create({
        ...req.body,
        userId: req.user.id
      });

      return this.sendSuccess(res, { recipe }, 'Recipe created successfully', 201);
    } catch (error) {
      return this.sendError(res, 'Error creating recipe', 500, error.message);
    }
  }

  // Update recipe
  async updateRecipe(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const recipe = await Recipe.findByPk(req.params.id);
      if (!recipe) {
        return this.sendNotFound(res, 'Recipe not found');
      }

      if (recipe.userId !== req.user.id) {
        return this.sendForbidden(res, 'Not authorized to update this recipe');
      }

      await recipe.update(req.body);

      return this.sendSuccess(res, { recipe }, 'Recipe updated successfully');
    } catch (error) {
      return this.sendError(res, 'Error updating recipe', 500, error.message);
    }
  }

  // Delete recipe
  async deleteRecipe(req, res) {
    try {
      const recipe = await Recipe.findByPk(req.params.id);
      if (!recipe) {
        return this.sendNotFound(res, 'Recipe not found');
      }

      if (recipe.userId !== req.user.id) {
        return this.sendForbidden(res, 'Not authorized to delete this recipe');
      }

      await recipe.destroy();

      return this.sendSuccess(res, null, 'Recipe deleted successfully');
    } catch (error) {
      return this.sendError(res, 'Error deleting recipe', 500, error.message);
    }
  }

  // Add ingredient to recipe
  async addIngredient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const recipe = await Recipe.findByPk(req.params.id);
      if (!recipe) {
        return this.sendNotFound(res, 'Recipe not found');
      }

      if (recipe.userId !== req.user.id) {
        return this.sendForbidden(res, 'Not authorized to modify this recipe');
      }

      const ingredient = await RecipeIngredient.create({
        ...req.body,
        recipeId: recipe.id
      });

      return this.sendSuccess(res, { ingredient }, 'Ingredient added successfully', 201);
    } catch (error) {
      return this.sendError(res, 'Error adding ingredient', 500, error.message);
    }
  }

  // Update recipe ingredient
  async updateIngredient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const ingredient = await RecipeIngredient.findOne({
        where: {
          id: req.params.ingredientId,
          recipeId: req.params.id
        }
      });

      if (!ingredient) {
        return this.sendNotFound(res, 'Ingredient not found');
      }

      const recipe = await Recipe.findByPk(req.params.id);
      if (recipe.userId !== req.user.id) {
        return this.sendForbidden(res, 'Not authorized to modify this recipe');
      }

      await ingredient.update(req.body);

      return this.sendSuccess(res, { ingredient }, 'Ingredient updated successfully');
    } catch (error) {
      return this.sendError(res, 'Error updating ingredient', 500, error.message);
    }
  }

  // Remove ingredient from recipe
  async removeIngredient(req, res) {
    try {
      const ingredient = await RecipeIngredient.findOne({
        where: {
          id: req.params.ingredientId,
          recipeId: req.params.id
        }
      });

      if (!ingredient) {
        return this.sendNotFound(res, 'Ingredient not found');
      }

      const recipe = await Recipe.findByPk(req.params.id);
      if (recipe.userId !== req.user.id) {
        return this.sendForbidden(res, 'Not authorized to modify this recipe');
      }

      await ingredient.destroy();

      return this.sendSuccess(res, null, 'Ingredient removed successfully');
    } catch (error) {
      return this.sendError(res, 'Error removing ingredient', 500, error.message);
    }
  }

  // Get recipe suggestions based on pantry items
  async getRecipeSuggestions(req, res) {
    try {
      const { pantryItemIds } = req.query;
      if (!pantryItemIds) {
        return this.sendError(res, 'Pantry item IDs are required', 400);
      }

      const recipes = await Recipe.findAll({
        include: [
          {
            model: GroceryItem,
            where: {
              id: {
                [Op.in]: pantryItemIds.split(',')
              }
            },
            through: { attributes: ['quantity', 'unit'] }
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return this.sendSuccess(res, { recipes });
    } catch (error) {
      return this.sendError(res, 'Error getting recipe suggestions', 500, error.message);
    }
  }
}

module.exports = new RecipeController(); 