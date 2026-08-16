const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware
const registerValidation = [
  body('username').trim().isLength({ min: 3 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, registerValidation, authController.updateProfile);
router.put('/change-password', authMiddleware, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], authController.changePassword);

module.exports = router; 