const { createGmailClient } = require('../../config/gmail');
const prisma = require('../../config/prisma');
const { analyzeEmailImportance } = require('../ai/groq.service');
const logger = require('../../shared/utils/logger');

const processEmailBatch = async (userId, user, emailsToSync) => {
  if (!emailsToSync || emailsToSync.length === 0) return [];

  const defaultDepartments = [
    'hr', 'human resources', 'recruitment', 'talent acquisition', 'hiring', 'careers',
    'corporate office', 'ceo', 'cto', 'cfo', 'director', 'manager', 'team lead',
    'finance', 'accounts', 'payroll', 'operations', 'legal', 'compliance',
    'admin', 'support', 'it support', 'helpdesk', 'customer success',
    'project manager', 'delivery manager', 'noreply', 'notifications', 'info', 'sales', 'billing'
  ];

  const userSettings = await prisma.settings.findUnique({ where: { userId } });
  const userDomain = userSettings?.companyDomain?.toLowerCase();
  const userDepartments = userSettings?.departmentKeywords?.map(d => d.toLowerCase()) || [];
  const allDepartments = [...new Set([...defaultDepartments, ...userDepartments])];

  const bulkOps = [];

  for (const emailData of emailsToSync) {
    let category = 'Inbox';
    let isTeamMail = false;
    let rank = 7;

    const senderEmailStr = emailData.senderEmail || '';
    const senderNameStr = emailData.senderName || '';
    const senderDomain = senderEmailStr.split('@')[1]?.toLowerCase();
    const senderUser = senderEmailStr.split('@')[0]?.toLowerCase() || '';
    const senderNameLower = senderNameStr.toLowerCase();

    const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com', 'protonmail.com'];
    const isSenderCompanyDomain = senderDomain && !publicDomains.includes(senderDomain);

    const isDepartment = allDepartments.some(dep => {
      if (dep.length <= 3) {
         const regex = new RegExp(`\\b${dep}\\b`, 'i');
         return regex.test(senderUser) || regex.test(senderNameLower);
      }
      return senderUser.includes(dep) || senderNameLower.includes(dep);
    });

    if (isDepartment) {
      category = 'Company';
      emailData.aiPriority = 'High';
      emailData.aiReason = "Official company department email.";
      emailData.aiConfidence = 100;
      rank = 1;
    } else {
      if (isSenderCompanyDomain || (userDomain && senderDomain === userDomain)) {
        category = 'Team';
        isTeamMail = true;
        rank = 2;
        emailData.aiPriority = 'Medium';
      }
    }

    emailData.aiCategory = category;
    const fullContent = `${emailData.subject}\n\n${emailData.snippet}`;
    
    try {
      const aiResult = await analyzeEmailImportance(fullContent, isTeamMail);
      
      if (aiResult.success) {
        if (category === 'Company') {
           emailData.aiReason = "Official company department email. " + aiResult.data.reason;
           emailData.aiConfidence = aiResult.data.confidence || 100;
           emailData.isAnalyzed = true;
        } else if (category === 'Team') {
           emailData.aiPriority = aiResult.data.priority;
           emailData.aiReason = aiResult.data.reason;
           emailData.aiConfidence = aiResult.data.confidence;
           emailData.isAnalyzed = true;
           rank = (emailData.aiPriority === 'High') ? 1 : 2;
        } else {
           emailData.aiPriority = aiResult.data.priority;
           emailData.aiReason = aiResult.data.reason;
           emailData.aiConfidence = aiResult.data.confidence;
           emailData.isAnalyzed = true;
           if (emailData.aiPriority === 'High') rank = 1;
           else if (emailData.aiPriority === 'Medium') rank = 2;
           else { emailData.aiPriority = 'Low'; rank = 3; }
        }
      } else {
         if (category !== 'Company' && category !== 'Team') {
             emailData.aiPriority = 'Low';
             rank = 3;
         }
      }
    } catch (aiErr) {
      logger.error(`AI Analysis failed for msg ${emailData.gmailMessageId}: ${aiErr.message}`);
      if (category !== 'Company' && category !== 'Team') {
         emailData.aiPriority = 'Low';
         rank = 3;
      }
    }

    emailData.globalPriorityRank = rank;

    bulkOps.push(
      prisma.email.upsert({
        where: { gmailMessageId: emailData.gmailMessageId },
        update: emailData,
        create: { userId: user.id, ...emailData }
      })
    );
  }

  if (bulkOps.length > 0) {
    await prisma.$transaction(bulkOps);
  }

  return emailsToSync;
};

const activeSyncs = new Map();

const syncEmails = async (userId, pageToken = null, maxResults = 50) => {
  if (activeSyncs.has(userId) && !pageToken) {
    logger.warn(`Sync already running for user ${userId}. Ignoring duplicate sync request.`);
    return { syncedEmails: [], nextPageToken: null, isLocked: true };
  }

  if (!pageToken) {
    activeSyncs.set(userId, true);
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.gmailAccessToken) {
      throw new Error('User not connected to Gmail or tokens missing');
    }

    const gmailService = require('./gmail.service');
    const { emails, nextPageToken } = await gmailService.syncRecentEmails(user, maxResults, pageToken);

    if (emails.length === 0) {
      logger.info('No new messages found.');
      return { syncedEmails: [], nextPageToken: null };
    }

    const processed = await processEmailBatch(userId, user, emails);
    logger.info(`Successfully synced ${processed.length} emails for user ${userId}`);
    
    return { syncedEmails: processed, nextPageToken };
  } catch (error) {
    logger.error('Error syncing emails:', error);
    throw error;
  } finally {
    if (!pageToken) {
      activeSyncs.delete(userId);
    }
  }
};

const startBackgroundHistoricalSync = async (userId, startingPageToken) => {
  if (activeSyncs.has(`${userId}_historical`)) {
    logger.warn(`Historical sync already running for user ${userId}. Ignoring duplicate request.`);
    return;
  }

  activeSyncs.set(`${userId}_historical`, true);

  // Fire and forget background process
  setImmediate(async () => {
    try {
      logger.info(`Starting background historical sync for user ${userId}`);
      let pageToken = startingPageToken;
      let totalSynced = 0;
      let limit = 2000; // max chunks, supports 100,000+ emails
      let currentChunk = 0;

      while (pageToken && currentChunk < limit) {
        currentChunk++;
        logger.info(`Historical Sync Chunk ${currentChunk} for user ${userId}`);
        const result = await syncEmails(userId, pageToken, 50);
        pageToken = result.nextPageToken;
        totalSynced += result.syncedEmails.length;
      }
      logger.info(`Completed background historical sync for user ${userId}. Total synced: ${totalSynced}`);
    } catch (error) {
      logger.error(`Background sync failed for user ${userId}: ${error.message}`);
    } finally {
      activeSyncs.delete(`${userId}_historical`);
    }
  });
};

module.exports = {
  syncEmails,
  startBackgroundHistoricalSync
};
