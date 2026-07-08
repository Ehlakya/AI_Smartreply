const http = require('http');
const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./shared/utils/logger');
const { initSocket } = require('./modules/notification/socket.service');

const server = http.createServer(app);

const envValidator = require('./config/envValidator');

// Initialize Socket.io
initSocket(server);

// Start server and connect to DB
const startServer = async () => {
  try {
    // 1. Validate Environment
    envValidator();
    console.log('✓ Environment Loaded and Validated');

    // 2. Connect to Database (will throw if it fails)
    if (env.DB_URL) {
      const scheme = env.DB_URL.split(':')[0];
      console.log(`✓ Database URL is loaded (Scheme: ${scheme}://***)`);
    } else {
      console.log('⚠ Database URL is NOT loaded');
    }
    
    await connectDB();
    console.log('✓ MongoDB Connected');

    // 3. Setup Complete
    if (env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_ID.includes('your_')) {
      console.log('✓ Passport Initialized');
      console.log('✓ Google OAuth Ready');
      console.log('✓ Gmail API Ready');
    } else {
      console.log('⚠ Google OAuth Disabled');
    }

    console.log('✓ Express Initialized');

    // Start background sync job
    const startAutoSync = require('./shared/jobs/sync.job');
    startAutoSync();

    // 4. Start Listening
    server.listen(env.PORT, () => {
      console.log(`✓ Express Server Running on Port ${env.PORT}\n`);
    });
  } catch (error) {
    logger.error('Failed to start server cleanly:', error);
    console.error('\n⚠ FATAL STARTUP ERROR ⚠');
    console.error('The server cannot start due to the above errors (e.g. missing credentials or database offline).');
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
