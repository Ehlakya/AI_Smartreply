const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../user/user.model');
const env = require('../../config/env');
const { generateAccessToken, generateRefreshToken } = require('../../shared/utils/jwt');

const oAuth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

// We simulate Microsoft Auth for now as it requires MSAL specific setup
// But we build the structure to easily drop it in.

const handleGoogleCallback = async (code) => {
  // Exchange code for tokens
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Get user info
  const ticket = await oAuth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  // Find or create user
  let user = await User.findOne({ email: payload.email });
  if (!user) {
    user = new User({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });
  }

  // Store tokens in user document for background sync
  user.gmailAccessToken = tokens.access_token;
  user.gmailRefreshToken = tokens.refresh_token || user.gmailRefreshToken;
  
  // Generate our app's JWTs
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
};

const refreshSession = async (oldRefreshToken) => {
  try {
    const decoded = jwt.verify(oldRefreshToken, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || user.refreshToken !== oldRefreshToken) {
      throw new Error('Invalid refresh token');
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw new Error('Unauthorized');
  }
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

module.exports = {
  handleGoogleCallback,
  refreshSession,
  logout
};
