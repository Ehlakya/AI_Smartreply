const { google } = require('googleapis');
const env = require('./env');

const createGmailClient = (user) => {
  const oAuth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  oAuth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken,
  });

  return google.gmail({ version: 'v1', auth: oAuth2Client });
};

module.exports = {
  createGmailClient
};
