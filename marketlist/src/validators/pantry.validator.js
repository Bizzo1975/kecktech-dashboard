const { body } = require('express-validator');
const { VALID_UNITS } = require('./grocery.validator');

// Pantry item validation
const validatePantryItem = [
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
  body('minimumQuantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum quantity must be a positive number')
    .custom((value, { req }) => {
      if (value > req.body.quantity) {
        throw new Error('Minimum quantity cannot be greater than current quantity');
      }
      return true;
    }),
  body('expirationDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiration date format')
    .custom((value) => {
      const date = new Date(value);
      if (date < new Date()) {
        throw new Error('Expiration date cannot be in the past');
      }
      if (date > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) {
        throw new Error('Expiration date cannot be more than 1 year in the future');
      }
      return true;
    }),
  body('purchaseDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid purchase date format')
    .custom((value) => {
      const date = new Date(value);
      if (date > new Date()) {
        throw new Error('Purchase date cannot be in the future');
      }
      if (date < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) {
        throw new Error('Purchase date cannot be more than 1 year in the past');
      }
      return true;
    }),
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a positive number')
    .custom((value) => {
      if (value > 999999.99) {
        throw new Error('Purchase price cannot exceed 999,999.99');
      }
      return true;
    }),
  body('store')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Store name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,&]+$/)
    .withMessage('Store name can only contain letters, numbers, spaces, and basic punctuation'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

// Item quantity validation
const validateItemQuantity = [
  body('quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number greater than 0')
    .custom((value) => {
      if (value > 9999) {
        throw new Error('Quantity cannot exceed 9999');
      }
      return true;
    })
];

module.exports = {
  validatePantryItem,
  validateItemQuantity
}; 