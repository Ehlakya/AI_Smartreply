const logger = require('../utils/logger');
const { sendError } = require('../utils/response');
const env = require('../../config/env');

const errorMiddleware = (err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}\n${err.stack}`);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific MongoDB errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with id of ${err.value}`;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // In production, we don't want to leak stack traces
  const payload = env.NODE_ENV === 'development' ? err.stack : null;

  sendError(res, message, statusCode, payload);
};

module.exports = errorMiddleware;
