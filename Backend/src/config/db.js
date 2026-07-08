const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../shared/utils/logger');

const connectDB = async () => {
  try {
    if (!env.DB_URL) {
      throw new Error('DB_URL is missing or undefined in environment variables.');
    }

    // The application expects MongoDB but a DB_URL is provided
    // Mongoose does not support Postgres, so we removed the scheme check, but it will still fail.

    // Disable command buffering so queries fail instantly instead of timing out after 10s
    mongoose.set('bufferCommands', false);
    
    const conn = await mongoose.connect(env.DB_URL, {
      serverSelectionTimeoutMS: 5000 // fail quickly if MongoDB is offline
    });
    return true; // Successfully connected
  } catch (error) {
    logger.error('MongoDB Connection Error:');
    logger.error(error.message);
    logger.error('Please ensure MongoDB is running and your MONGO_URI is correct.');
    throw error;
  }
};

module.exports = connectDB;
