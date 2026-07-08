const authService = require('./auth.service');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const env = require('../../config/env');
const logger = require('../../shared/utils/logger');
const { generateAccessToken, generateRefreshToken } = require('../../shared/utils/jwt');
const prisma = require('../../config/prisma');

// Step 1: Handle Google Callback (User authenticated by Passport)
const googleCallback = async (req, res) => {
  try {
    const user = req.user; // Provided by passport
    if (!user) {
      if (env.NODE_ENV === 'development') console.error('[OAuth] Google authentication failed. No user object returned.');
      return res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
    }

    if (env.NODE_ENV === 'development') console.log(`[OAuth] Login successful for user: ${user.id}`);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    if (env.NODE_ENV === 'development') console.log(`[OAuth] Redirect completed to frontend sync screen.`);
    res.redirect(`${env.FRONTEND_URL}/sync?token=${accessToken}`);
  } catch (error) {
    logger.error('Google Auth Error:', error);
    res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
  }
};


// Step 3: Refresh Token
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(200).json({ success: true, data: { isAuthenticated: false } });
    }

    const { accessToken, refreshToken: newRefreshToken, user } = await authService.refreshSession(token);
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        isAuthenticated: true,
        accessToken,
        user
      }
    });
  } catch (error) {
    // Expected behavior for unauthenticated users, log as debug instead of error
    if (env.NODE_ENV === 'development' && error.message !== 'Unauthorized') {
      logger.error('Refresh Token Error:', error);
    }
    res.status(200).json({ success: true, data: { isAuthenticated: false } });
  }
};

// Step 4: Get Current User
const getMe = (req, res) => {
  try {
    sendSuccess(res, 'User profile fetched', { user: req.user });
  } catch (error) {
    sendError(res, 'Failed to fetch profile', 500);
  }
};

// Step 5: Logout
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await authService.logout(req.user.id || req.user._id);
    }
    res.clearCookie('refreshToken');
    sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

// Step 6: Dev Login Bypass
const devLogin = async (req, res) => {
  try {
    let user;
    
    try {
      user = await prisma.user.findUnique({ where: { email: 'dev@example.com' } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId: 'dev_user_123',
            email: 'dev@example.com',
            name: 'Developer Mode',
            picture: 'https://ui-avatars.com/api/?name=Dev',
            role: 'admin'
          }
        });
      }
    } catch (dbError) {
      // Mock user if DB is offline
      user = {
        id: require('crypto').randomUUID(),
        email: 'dev@example.com',
        name: 'Developer Mode (Offline DB)',
        picture: 'https://ui-avatars.com/api/?name=Dev'
      };
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
      });
    } catch (e) {
      // ignore offline errors
    }

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.redirect(`${env.FRONTEND_URL}/sync?token=${accessToken}`);
  } catch (error) {
    if (env.NODE_ENV === 'development') console.error('Dev Auth Error:', error);
    res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
  }
};

module.exports = {
  googleCallback,
  refreshToken,
  getMe,
  logout,
  devLogin
};
