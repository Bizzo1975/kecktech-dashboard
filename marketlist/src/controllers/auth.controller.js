const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const BaseController = require('./base.controller');
const { User } = require('../models');

class AuthController extends BaseController {
  // Register new user
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const { email, username, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }]
        }
      });

      if (existingUser) {
        return this.sendError(res, 'User already exists', 400);
      }

      // Create new user
      const user = await User.create({
        email,
        username,
        password,
        firstName,
        lastName
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      return this.sendSuccess(res, {
        user: userResponse,
        token
      }, 'User registered successfully', 201);
    } catch (error) {
      return this.sendError(res, 'Error registering user', 500, error.message);
    }
  }

  // User login
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return this.sendError(res, 'Invalid credentials', 401);
      }

      // Verify password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        return this.sendError(res, 'Invalid credentials', 401);
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      return this.sendSuccess(res, {
        user: userResponse,
        token
      }, 'Login successful');
    } catch (error) {
      return this.sendError(res, 'Error logging in', 500, error.message);
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return this.sendNotFound(res, 'User not found');
      }

      return this.sendSuccess(res, { user });
    } catch (error) {
      return this.sendError(res, 'Error fetching profile', 500, error.message);
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const { firstName, lastName, email } = req.body;

      // Check if email is already taken
      if (email !== req.user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return this.sendError(res, 'Email already in use', 400);
        }
      }

      // Update user
      await req.user.update({
        firstName,
        lastName,
        email
      });

      const userResponse = req.user.toJSON();
      delete userResponse.password;

      return this.sendSuccess(res, { user: userResponse }, 'Profile updated successfully');
    } catch (error) {
      return this.sendError(res, 'Error updating profile', 500, error.message);
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isValidPassword = await req.user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return this.sendError(res, 'Current password is incorrect', 401);
      }

      // Update password
      await req.user.update({ password: newPassword });

      return this.sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      return this.sendError(res, 'Error changing password', 500, error.message);
    }
  }
}

module.exports = new AuthController(); 