const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const env = require('./env');

const isValidOAuth = (
  env.GOOGLE_CLIENT_ID &&
  env.GOOGLE_CLIENT_SECRET &&
  !env.GOOGLE_CLIENT_ID.includes('paste-') &&
  !env.GOOGLE_CLIENT_SECRET.includes('paste-') &&
  env.GOOGLE_CLIENT_ID !== 'your_google_client_id'
);

if (isValidOAuth) {
  passport.use(new GoogleStrategy({
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_REDIRECT_URI,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        if (env.NODE_ENV === 'development') {
          console.log(`[OAuth] Google callback received for profile ID: ${profile.id}`);
          console.log(`[OAuth] Token exchange successful.`);
        }

        const prisma = require('../../src/config/prisma');
        
        let user = await prisma.user.upsert({
          where: { googleId: profile.id },
          update: {
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
            gmailAccessToken: accessToken,
            ...(refreshToken && { gmailRefreshToken: refreshToken }),
          },
          create: {
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
            gmailAccessToken: accessToken,
            gmailRefreshToken: refreshToken || null,
          }
        });
        
        // Backward compatibility
        user._id = user.id;

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
} else {
  console.warn('⚠ Google OAuth initialization failed: Client ID or Secret is missing or invalid.');
}

module.exports = passport;
