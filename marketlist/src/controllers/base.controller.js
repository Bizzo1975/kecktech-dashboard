class BaseController {
  // Success response
  sendSuccess(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data
    });
  }

  // Error response
  sendError(res, message = 'Error occurred', statusCode = 500, errors = null) {
    const response = {
      status: 'error',
      message
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  // Validation error response
  sendValidationError(res, errors) {
    return this.sendError(res, 'Validation failed', 400, errors);
  }

  // Not found error response
  sendNotFound(res, message = 'Resource not found') {
    return this.sendError(res, message, 404);
  }

  // Unauthorized error response
  sendUnauthorized(res, message = 'Unauthorized access') {
    return this.sendError(res, message, 401);
  }

  // Forbidden error response
  sendForbidden(res, message = 'Forbidden access') {
    return this.sendError(res, message, 403);
  }
}

module.exports = BaseController; 