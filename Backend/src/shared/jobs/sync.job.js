const cron = require('node-cron');
const prisma = require('../../config/prisma');
const { syncEmails } = require('../../modules/email/email.service');
const logger = require('../utils/logger');

// Run every 5 minutes
const startAutoSync = () => {
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Starting Auto Sync Job...');
    
    try {
      // Connect check is implicit with Prisma
      const users = await prisma.user.findMany({
        where: {
          gmailAccessToken: { not: null }
        }
      });
      
      if (users.length === 0) {
        logger.info('No active users found for sync.');
        return;
      }

      for (const user of users) {
        try {
          logger.info(`Syncing emails for user: ${user.email}`);
          const newEmails = await syncEmails(user.id);
          
          if (newEmails && newEmails.length > 0) {
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
