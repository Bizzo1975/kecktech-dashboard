const express = require('express');
const router = express.Router();
const { recipeSuggestionController, validateDietaryPreferences } = require('../controllers/recipe-suggestion.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

// Get recipe suggestions based on pantry items
router.get(
  '/suggestions',
  authenticate,
  recipeSuggestionController.getRecipeSuggestions.bind(recipeSuggestionController)
);

// Get recipe suggestions for expiring items
router.get(
  '/suggestions/expiring',
  authenticate,
  recipeSuggestionController.getSuggestionsForExpiringItems.bind(recipeSuggestionController)
);

// Get recipe suggestions based on dietary preferences
router.post(
  '/suggestions/dietary',
  authenticate,
  validateDietaryPreferences,
  validate,
  recipeSuggestionController.getSuggestionsByDietaryPreferences.bind(recipeSuggestionController)
);

module.exports = router; 