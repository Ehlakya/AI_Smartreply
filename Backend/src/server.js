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
    const isEnvValid = envValidator();
    console.log('✓ Environment Loaded');
    if (isEnvValid) {
      console.log('✓ Environment Validated');
    }

    // 2. Connect to MongoDB
    const dbConnected = await connectDB();
    if (dbConnected) {
      console.log('✓ MongoDB Connected');
    } else {
      console.log('⚠ MongoDB Offline');
    }

    // 3. Setup Complete
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID !== 'your_google_client_id') {
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
    // As per new fault-tolerance requirements, we never exit the process.
    // We just attempt to listen anyway so the frontend can at least get basic responses.
    server.listen(env.PORT, () => {
      console.log(`⚠ Express Server Running on Port ${env.PORT} (with startup errors)\n`);
    });
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
