const jwt = require('jsonwebtoken');
const User = require('../../modules/user/user.model');
const env = require('../../config/env');
const { sendError } = require('../utils/response');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  let token;

  logger.info(`[Auth Middleware] Incoming request to ${req.originalUrl}`);
  logger.info(`[Auth Middleware] Authorization Header: ${req.headers.authorization || 'MISSING'}`);

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    logger.warn('[Auth Middleware] Rejected: Token missing or does not start with Bearer.');
    return sendError(res, 'Not authorized to access this route', 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    logger.info(`[Auth Middleware] Decoded JWT Payload: ${JSON.stringify(decoded)}`);

    req.user = await User.findById(decoded.id).select('-refreshToken -gmailAccessToken -gmailRefreshToken');
    
    if (!req.user) {
      logger.warn(`[Auth Middleware] Rejected: User ID ${decoded.id} not found in database.`);
      return sendError(res, 'User not found', 401);
    }
    
    logger.info(`[Auth Middleware] Authenticated User ID: ${req.user._id}`);
    next();
  } catch (error) {
    logger.error(`[Auth Middleware] Rejected: JWT Verification Failed - ${error.message}`);
    return sendError(res, 'Not authorized, token failed', 401);
  }
};

module.exports = authMiddleware;
