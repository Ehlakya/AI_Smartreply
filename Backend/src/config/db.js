const env = require('./env');
const logger = require('../shared/utils/logger');
const prisma = require('./prisma');

const connectDB = async () => {
  try {
    if (!env.DB_URL) {
      throw new Error('DB_URL is missing or undefined in environment variables.');
    }

    // Connect to PostgreSQL via Prisma
    await prisma.$connect();
    return true; // Successfully connected
  } catch (error) {
    logger.error('PostgreSQL Connection Error:');
    logger.error(error.message);
    logger.error('Please ensure PostgreSQL is running and your DB_URL is correct.');
    throw error;
  }
};

module.exports = connectDB;
