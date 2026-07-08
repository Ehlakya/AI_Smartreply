const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const env = require('../../config/env');

// Passport Google Auth route
router.get('/google', (req, res, next) => {
  // Catch placeholder or missing credentials before they hit Google
  if (
    !env.GOOGLE_CLIENT_ID || 
    env.GOOGLE_CLIENT_ID.includes('paste-') ||
    env.GOOGLE_CLIENT_ID === 'your_google_client_id'
  ) {
    console.error('Google Client ID not found. OAuth configuration is invalid.');
    return res.redirect(`${env.FRONTEND_URL}/login?error=Google%20Client%20ID%20not%20found`);
  }

  if (!env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET.includes('paste-')) {
    console.error('Google Client Secret missing. OAuth configuration is invalid.');
    return res.redirect(`${env.FRONTEND_URL}/login?error=Google%20Client%20Secret%20missing`);
  }

  if (env.NODE_ENV === 'development') console.log(`[OAuth] Started - Redirecting user to Google Account Selection...`);

  passport.authenticate('google', {
    scope: [
      'profile', 
      'email', 
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send'
    ],
    accessType: 'offline',
    prompt: 'consent'
  })(req, res, next);
});

// Passport Google Callback
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: `${env.FRONTEND_URL}/login?error=true` }),
  authController.googleCallback
);

// Other Auth Routes
router.get('/dev-login', authController.devLogin);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
