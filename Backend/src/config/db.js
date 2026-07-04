const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../shared/utils/logger');

const connectDB = async () => {
  try {
    // Disable command buffering so queries fail instantly instead of timing out after 10s
    mongoose.set('bufferCommands', false);
    
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 2000 // fail quickly if MongoDB is offline
    });
    return true; // Successfully connected
  } catch (error) {
    logger.error('MongoDB server is offline or connection failed.');
    logger.error('Please ensure MongoDB is running or check your MONGO_URI.');
    logger.error(error.message);
    throw error;
  }
};

module.exports = connectDB;
