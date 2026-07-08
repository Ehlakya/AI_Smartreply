const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../../config/prisma');
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

  // Find or create user, and update tokens
  let user = await prisma.user.upsert({
    where: { email: payload.email },
    update: {
      googleId: payload.sub,
      name: payload.name,
      picture: payload.picture,
      gmailAccessToken: tokens.access_token,
      ...(tokens.refresh_token && { gmailRefreshToken: tokens.refresh_token })
    },
    create: {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      gmailAccessToken: tokens.access_token,
      gmailRefreshToken: tokens.refresh_token || null
    }
  });

  // Generate our app's JWTs
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  
  user = await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken }
  });

  // For backward compatibility in some controllers
  user._id = user.id;

  return { user, accessToken, refreshToken };
};

const refreshSession = async (oldRefreshToken) => {
  try {
    const decoded = jwt.verify(oldRefreshToken, env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user || user.refreshToken !== oldRefreshToken) {
      throw new Error('Invalid refresh token');
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken }
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw new Error('Unauthorized');
  }
};

const logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null }
  });
};

module.exports = {
  handleGoogleCallback,
  refreshSession,
  logout
};
