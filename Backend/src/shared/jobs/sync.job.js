const cron = require('node-cron');
const prisma = require('../../config/prisma');
const { syncEmails } = require('../../modules/email/email.service');
const logger = require('../utils/logger');

// Run every 5 minutes
const startAutoSync = () => {
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Starting Auto Sync Job...');
    
    try {
      const users = await prisma.user.findMany({
        where: {
          gmailAccessToken: { not: null }
        }
      });
      
      if (users.length === 0) {
        logger.info('No active users found for sync.');
        return;
      }

      const gmailService = require('../../modules/email/gmail.service');

      for (const user of users) {
        try {
          logger.info(`Syncing emails for user: ${user.email}`);
          // 1. Pull new emails
          const result = await syncEmails(user.id, null, 50);
          
          if (result && result.syncedEmails && result.syncedEmails.length > 0) {
            logger.info(`Synced ${result.syncedEmails.length} new emails for ${user.email}`);
          }

          // 2. Sync state changes (deletions)
          const localEmails = await prisma.email.findMany({
            where: { userId: user.id },
            select: { id: true, gmailMessageId: true }
          });
          
          const { emailsToDelete } = await gmailService.syncStateChanges(user, localEmails);
          
          if (emailsToDelete && emailsToDelete.length > 0) {
             logger.info(`Detected ${emailsToDelete.length} deleted emails remotely. Removing locally...`);
             await prisma.email.deleteMany({
                where: { id: { in: emailsToDelete } }
             });
          }

        } catch (error) {
          logger.error(`Failed to sync user ${user.email}: ${error.message}`);
        }
      }
      
      logger.info('Auto Sync Job Completed.');
    } catch (error) {
      logger.error('Auto Sync Job Error:', error);
    }
  });
};

module.exports = startAutoSync;
