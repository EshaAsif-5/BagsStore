// middleware/errorMiddleware.js
// Provides:
//  1. A custom ApiError class for throwing operational errors with
//     a specific HTTP status code and message from anywhere in the app.
//  2. A "not found" handler for unmatched routes.
//  3. A global error-handling middleware that formats all errors into
//     a consistent JSON response shape, as defined in the API
//     architecture (success/error envelope).

const env = require('../config/env');

/**
 * Custom error class for predictable, operational errors
 * (e.g., "Product not found", "Invalid credentials").
 *
 * Usage:
 *   throw new ApiError(404, 'Product not found');
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handles requests to routes that don't exist.
 * Must be registered AFTER all valid routes in app.js.
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler — catches errors passed via next(error)
 * from anywhere in the app (including asyncHandler-wrapped controllers).
 *
 * Must be registered LAST, after all other middleware/routes.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // --- Handle specific known error types from Mongoose/JWT etc. ---

  // Mongoose: Invalid ObjectId format (e.g., malformed ID in URL params)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = `Invalid ID format: ${err.value}`;
  }

  // Mongoose: Validation errors (e.g., required field missing)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Mongoose: Duplicate key error (e.g., email/SKU already exists)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for field: ${field}`;
  }

  // JWT: Invalid token signature
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  // JWT: Expired token
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }

  // Log the error server-side for debugging.
  // In production, avoid logging full stack traces to stdout if using
  // a dedicated error tracker (e.g., Sentry) — but console logging
  // is kept here as a baseline.
  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (!env.isProduction) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode,
      message,
      // Only expose stack traces in non-production environments —
      // never leak internal implementation details to clients in production.
      ...(env.isProduction ? {} : { stack: err.stack }),
    },
  });
};

module.exports = { ApiError, notFound, errorHandler };