const { body } = require('express-validator');

// Valid categories for grocery items
const VALID_CATEGORIES = [
  'Fruits & Vegetables',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Frozen Foods',
  'Pantry',
  'Snacks',
  'Beverages',
  'Household',
  'Personal Care'
];

// Valid units of measurement
const VALID_UNITS = [
  'piece',
  'kg',
  'g',
  'lb',
  'oz',
  'l',
  'ml',
  'cup',
  'tbsp',
  'tsp',
  'box',
  'pack',
  'bundle'
];

// Grocery item validation
const validateGroceryItem = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,&]+$/)
    .withMessage('Name can only contain letters, numbers, spaces, and basic punctuation'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(VALID_CATEGORIES)
    .withMessage('Invalid category'),
  body('unit')
    .trim()
    .notEmpty()
    .withMessage('Unit is required')
    .isIn(VALID_UNITS)
    .withMessage('Invalid unit of measurement'),
  body('barcode')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Barcode must be less than 50 characters')
    .matches(/^[0-9\-]+$/)
    .withMessage('Barcode can only contain numbers and hyphens'),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Invalid image URL')
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)
    .withMessage('Image must be in JPG, PNG, GIF, or WebP format'),
  body('nutritionalInfo')
    .optional()
    .isObject()
    .withMessage('Nutritional info must be an object')
    .custom((value) => {
      const requiredFields = ['calories', 'protein', 'carbs', 'fat'];
      for (const field of requiredFields) {
        if (typeof value[field] !== 'number' || value[field] < 0) {
          throw new Error(`Invalid ${field} value in nutritional info`);
        }
      }
      return true;
    })
];

// Grocery list validation
const validateGroceryList = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,&]+$/)
    .withMessage('Name can only contain letters, numbers, spaces, and basic punctuation'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('isShared')
    .optional()
    .isBoolean()
    .withMessage('isShared must be a boolean value')
];

// List item validation
const validateListItem = [
  body('groceryItemId')
    .isUUID()
    .withMessage('Invalid grocery item ID'),
  body('quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number greater than 0')
    .custom((value) => {
      if (value > 9999) {
        throw new Error('Quantity cannot exceed 9999');
      }
      return true;
    }),
  body('unit')
    .trim()
    .notEmpty()
    .withMessage('Unit is required')
    .isIn(VALID_UNITS)
    .withMessage('Invalid unit of measurement'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes must be less than 200 characters')
];

module.exports = {
  validateGroceryItem,
  validateGroceryList,
  validateListItem,
  VALID_CATEGORIES,
  VALID_UNITS
}; 