const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { sendError } = require('../utils/response');
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

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });
    } catch (dbError) {
      // If DB is offline, mimic the old behavior
      req.user = {
        id: decoded.id,
        email: 'dev@example.com',
        name: 'Developer Mode (Offline DB)',
        picture: 'https://ui-avatars.com/api/?name=Dev',
        gmailAccessToken: 'dev_mock_token'
      };
      logger.warn(`[Auth Middleware] DB Offline or Error. Authenticating virtual dev user.`);
      return next();
    }

    if (!user) {
      logger.warn(`[Auth Middleware] Rejected: User ID ${decoded.id} not found in database.`);
      return sendError(res, 'User not found', 401);
    }
    
    // Omit refresh token
    delete user.refreshToken;
    
    req.user = user;
    // Map _id to id for backwards compatibility if any route expects _id
    req.user._id = user.id;

    logger.info(`[Auth Middleware] Authenticated User ID: ${req.user.id}`);
    next();
  } catch (error) {
    logger.error(`[Auth Middleware] Rejected: JWT Verification Failed - ${error.message}`);
    return sendError(res, 'Not authorized, token failed', 401);
  }
};

module.exports = authMiddleware;
