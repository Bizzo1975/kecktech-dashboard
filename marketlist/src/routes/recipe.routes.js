const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const recipeController = require('../controllers/recipe.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware
const recipeValidation = [
  body('name').trim().notEmpty().escape(),
  body('description').optional().trim().escape(),
  body('instructions').trim().notEmpty().escape(),
  body('prepTime').optional().isInt({ min: 0 }),
  body('cookTime').optional().isInt({ min: 0 }),
  body('servings').isInt({ min: 1 }),
  body('difficulty').isIn(['easy', 'medium', 'hard']),
  body('imageUrl').optional().isURL(),
  body('isPublic').optional().isBoolean(),
  body('tags').optional().isArray()
];

const ingredientValidation = [
  body('groceryItemId').isUUID(),
  body('quantity').isFloat({ min: 0 }),
  body('unit').trim().notEmpty(),
  body('notes').optional().trim(),
  body('optional').optional().isBoolean()
];

// Public routes
router.get('/', recipeController.getAllRecipes);
router.get('/:id', recipeController.getRecipeById);
router.get('/search', recipeController.searchRecipes);

// Protected routes
router.use(authMiddleware);
router.post('/', recipeValidation, recipeController.createRecipe);
router.put('/:id', recipeValidation, recipeController.updateRecipe);
router.delete('/:id', recipeController.deleteRecipe);

// Recipe ingredients
router.post('/:id/ingredients', ingredientValidation, recipeController.addIngredient);
router.put('/:id/ingredients/:ingredientId', ingredientValidation, recipeController.updateIngredient);
router.delete('/:id/ingredients/:ingredientId', recipeController.removeIngredient);

// Recipe suggestions
router.get('/suggestions', recipeController.getRecipeSuggestions);

module.exports = router; 