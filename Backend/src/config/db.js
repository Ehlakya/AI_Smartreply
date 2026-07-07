const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../shared/utils/logger');

const connectDB = async () => {
  try {
    if (!env.MONGO_URI) {
      throw new Error('MONGO_URI is missing or undefined in environment variables.');
    }

    if (!env.MONGO_URI.startsWith('mongodb://') && !env.MONGO_URI.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MONGO_URI scheme. Must start with "mongodb://" or "mongodb+srv://"');
    }

    // Disable command buffering so queries fail instantly instead of timing out after 10s
    mongoose.set('bufferCommands', false);
    
    const conn = await mongoose.connect(env.MONGO_URI, {
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
