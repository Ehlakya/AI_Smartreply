const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../../modules/user/user.model');
const { syncEmails } = require('../../modules/email/email.service');
const logger = require('../utils/logger');

// Run every 5 minutes
const startAutoSync = () => {
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Starting Auto Sync Job...');
    
    // Check if database is actually connected before querying
    if (mongoose.connection.readyState !== 1) {
      logger.warn('Auto Sync aborted: Database is offline.');
      return;
    }

    try {
      const users = await User.find({ gmailAccessToken: { $exists: true, $ne: null } });
      
      if (users.length === 0) {
        logger.info('No active users found for sync.');
        return;
      }

      for (const user of users) {
        try {
          logger.info(`Syncing emails for user: ${user.email}`);
          const newEmails = await syncEmails(user._id);
          
          if (newEmails.length > 0) {
            logger.info(`Synced ${newEmails.length} new emails for ${user.email}`);
            // In a production environment, we would also trigger AI categorization here
          }
        } catch (error) {
          logger.error(`Failed to sync user ${user.email}:`, error.message);
        }
      }
      
      logger.info('Auto Sync Job Completed.');
    } catch (error) {
      logger.error('Auto Sync Job Error:', error);
    }
  });
};

module.exports = startAutoSync;
