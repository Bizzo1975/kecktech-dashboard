const { ValidationError } = require('sequelize');

// Custom error class for business logic errors
class BusinessError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'BusinessError';
  }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Handle Sequelize validation errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Handle express-validator errors
  if (err.name === 'ValidationError' && Array.isArray(err.errors)) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors
    });
  }

  // Handle business logic errors
  if (err instanceof BusinessError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Handle JWT authentication errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired'
    });
  }

  // Handle database errors
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      status: 'error',
      message: 'Database error occurred'
    });
  }

  // Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      message: 'File size too large'
    });
  }

  // Default error
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};

module.exports = {
  errorHandler,
  BusinessError
}; 