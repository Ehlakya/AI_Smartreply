const { OAuth2Client } = require('google-auth-library');
const env = require('./env');

const oAuth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

// Helper to generate the auth URL
const getAuthUrl = () => {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh token
    prompt: 'consent', // Force to get refresh token
    response_type: 'code', // Specifies we want an auth code
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
    ],
  });
};

module.exports = {
  oAuth2Client,
  getAuthUrl,
};
