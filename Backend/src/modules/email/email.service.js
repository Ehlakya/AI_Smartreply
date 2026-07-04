const { createGmailClient } = require('../../config/gmail');
const Email = require('./email.model');
const User = require('../user/user.model');
const Settings = require('../settings/settings.model');
const { analyzeEmailImportance } = require('../ai/groq.service');
const logger = require('../../shared/utils/logger');

const syncEmails = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.gmailAccessToken) {
      throw new Error('User not connected to Gmail or tokens missing');
    }

    // Use gmailService to fetch and cleanly parse the emails
    const gmailService = require('./gmail.service');
    const emailsToSync = await gmailService.syncRecentEmails(user, 50);

    if (emailsToSync.length === 0) {
      logger.info('No new messages found.');
      return [];
    }

    // Extended department keywords
    const defaultDepartments = [
      'hr', 'human resources', 'recruitment', 'talent acquisition', 'hiring', 'careers',
      'corporate office', 'ceo', 'cto', 'cfo', 'director', 'manager', 'team lead',
      'finance', 'accounts', 'payroll', 'operations', 'legal', 'compliance',
      'admin', 'support', 'it support', 'helpdesk', 'customer success',
      'project manager', 'delivery manager', 'noreply', 'notifications', 'info', 'sales', 'billing'
    ];

    // Check against User Settings
    const userSettings = await Settings.findOne({ user: userId });
    const userDomain = userSettings?.companyDomain?.toLowerCase();
    const userTeamMembers = userSettings?.teamMembers?.map(t => t.toLowerCase()) || [];
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

      const userEmailDomain = user.email ? user.email.split('@')[1]?.toLowerCase() : '';
      const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com', 'protonmail.com'];
      
      // Treat any non-public domain as a company/team domain
      const isSenderCompanyDomain = senderDomain && !publicDomains.includes(senderDomain);

      // 1. Is it a department / official email?
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
        // 2. If not a department, is it a Team Member / Company Member?
        if (isSenderCompanyDomain || (userDomain && senderDomain === userDomain)) {
          category = 'Team';
          isTeamMail = true;
          rank = 2; // Default Team Medium
          emailData.aiPriority = 'Medium';
        }
      }

      emailData.aiCategory = category;

      // AI Analysis only for new unanalyzed items that aren't already purely team or company (or do it for all to get priority reasons)
      const fullContent = `${emailData.subject}\n\n${emailData.snippet}`;
      
      try {
        const aiResult = await analyzeEmailImportance(fullContent, isTeamMail);
        
        if (aiResult.success) {
          // If it was already a Company/Department email, keep High but use AI reason if helpful, or keep static.
          if (category === 'Company') {
             // We keep Rank 1, High priority. We can use AI reason.
             emailData.aiReason = "Official company department email. " + aiResult.data.reason;
             emailData.aiConfidence = aiResult.data.confidence || 100;
             emailData.isAnalyzed = true;
          } else if (category === 'Team') {
             emailData.aiPriority = aiResult.data.priority;
             emailData.aiReason = aiResult.data.reason;
             emailData.aiConfidence = aiResult.data.confidence;
             emailData.isAnalyzed = true;

             if (emailData.aiPriority === 'High') {
               rank = 1;
             } else {
               emailData.aiPriority = 'Medium';
               rank = 2;
             }
          } else {
             emailData.aiPriority = aiResult.data.priority;
             emailData.aiReason = aiResult.data.reason;
             emailData.aiConfidence = aiResult.data.confidence;
             emailData.isAnalyzed = true;

             if (emailData.aiPriority === 'High') {
               rank = 1;
             } else if (emailData.aiPriority === 'Medium') {
               rank = 2;
             } else {
               emailData.aiPriority = 'Low';
               rank = 3;
             }
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

      bulkOps.push({
        updateOne: {
          filter: { userId: user._id, gmailMessageId: emailData.gmailMessageId },
          update: { $set: emailData },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      await Email.bulkWrite(bulkOps);
    }

    logger.info(`Successfully synced ${bulkOps.length} new emails for user ${userId}`);
    return emailsToSync;
  } catch (error) {
    logger.error('Error syncing emails:', error);
    throw error;
  }
};

module.exports = {
  syncEmails
};
