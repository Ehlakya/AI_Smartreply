const prisma = require('../../config/prisma');
const gmailService = require('./gmail.service');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const emailService = require('./email.service');
const env = require('../../config/env');

/**
 * Trigger a Gmail Sync to fetch latest emails and store in DB.
 */
const syncEmails = async (req, res) => {
  try {
    const user = req.user;
    const isDevUser = user.email === 'dev@example.com' || user.role === 'admin';
    
    // In Prisma, we don't check connection explicitly this way, but we keep the dev bypass
    if (isDevUser && !user.gmailAccessToken) {
      logger.warn('Email Sync bypassed (Developer User).');
      return sendSuccess(res, 'Developer Mode Sync Simulated.', { syncedCount: 0 });
    }

    if (!user.gmailAccessToken) {
      return sendError(res, 'Google OAuth credentials missing.', 401);
    }

    // Call the dedicated service that handles AI classification and storage
    // Fetch the first 50 emails synchronously to show them immediately
    const result = await emailService.syncEmails(user.id, null, 50);

    if (result.isLocked) {
      return res.status(200).json({ success: false, message: 'Sync is already in progress.', isLocked: true });
    }

    // If there is more history, kick off a background sync process
    if (result.nextPageToken) {
      emailService.startBackgroundHistoricalSync(user.id, result.nextPageToken);
    }

    // Update user sync time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSyncAt: new Date() }
    });

    sendSuccess(res, 'Emails synced successfully. Background sync may be running for historical emails.', {
      syncedCount: result.syncedEmails.length,
      upsertedCount: result.syncedEmails.length,
      modifiedCount: 0
    });

  } catch (error) {
    logger.error(`Email Sync Controller Error: ${error.message}`);
    
    // Handle Gmail API Token errors safely
    if (error.message.includes('invalid_grant')) {
      return sendError(res, 'Gmail authentication expired. Please login again.', 401);
    }
    
    sendError(res, 'Unable to sync emails with Gmail.', 500);
  }
};

/**
 * Generic handler for fetching paginated emails by folder.
 */
const getEmailsByFolder = async (req, res, folder) => {
  try {
    const userId = req.user.id || req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const where = { userId };
    
    if (folder === 'starred') {
      where.isStarred = true;
    } else {
      where.folder = folder;
    }
    
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { receiverEmail: { contains: search, mode: 'insensitive' } },
        { senderEmail: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { snippet: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.email.count({ where })
    ]);

    const sanitizedEmails = emails.map(email => {
      const { htmlBody, body, id, ...rest } = email;
      return { ...rest, id, _id: id };
    });

    res.status(200).json({
      success: true,
      data: {
        emails: sanitizedEmails,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error(`Get Emails Error: ${error.message}`);
    sendError(res, 'Failed to fetch emails', 500);
  }
};

const getCategorizedEmails = async (req, res, category) => {
  try {
    const userId = req.user.id || req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { userId, folder: 'inbox' };
    if (category !== 'Priority') {
      where.aiCategory = category;
    }

    const emails = await prisma.email.findMany({
      where,
      orderBy: [
        { globalPriorityRank: 'asc' },
        { receivedAt: 'desc' }
      ],
      skip,
      take: limit
    });
    
    const total = await prisma.email.count({ where });

    const sanitizedEmails = emails.map(email => {
      const { htmlBody, body, id, ...rest } = email;
      return { ...rest, id, _id: id };
    });

    res.status(200).json({
      success: true,
      data: {
        emails: sanitizedEmails,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get Categorized Emails Error: ${error.message}`);
    sendError(res, 'Failed to fetch categorized emails', 500);
  }
};

const getInbox = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const where = { userId, folder: 'inbox' };
    
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { receiverEmail: { contains: search, mode: 'insensitive' } },
        { senderEmail: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { snippet: { contains: search, mode: 'insensitive' } }
      ];
    }

    const emails = await prisma.email.findMany({
      where,
      orderBy: [
        { globalPriorityRank: 'asc' },
        { receivedAt: 'desc' }
      ],
      skip,
      take: limit
    });
    
    const total = await prisma.email.count({ where });

    const sanitizedEmails = emails.map(email => {
      const { htmlBody, body, id, ...rest } = email;
      return { ...rest, id, _id: id };
    });

    res.status(200).json({
      success: true,
      data: {
        emails: sanitizedEmails,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error(`Get Inbox Error: ${error.message}`);
    sendError(res, 'Failed to fetch inbox emails', 500);
  }
};
const getSent = (req, res) => getEmailsByFolder(req, res, 'sent');
const getDrafts = (req, res) => getEmailsByFolder(req, res, 'drafts');
const getStarred = (req, res) => getEmailsByFolder(req, res, 'starred');
const getSpam = (req, res) => getEmailsByFolder(req, res, 'spam');
const getTrash = (req, res) => getEmailsByFolder(req, res, 'trash');
const getArchive = (req, res) => getEmailsByFolder(req, res, 'archive');

/**
 * Get a single full email by ID.
 */
const getEmailById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    
    const email = await prisma.email.findFirst({ where: { id, userId } });
    if (!email) {
      return sendError(res, 'Email not found', 404);
    }

    // Mark as read if it was unread
    if (!email.isRead) {
      await prisma.email.update({
        where: { id },
        data: { isRead: true }
      });
      email.isRead = true;
    }

    email._id = email.id;
    sendSuccess(res, 'Email fetched', { email });
  } catch (error) {
    logger.error(`Get Email By ID Error: ${error.message}`);
    sendError(res, 'Failed to fetch email details', 500);
  }
};

/**
 * Send a reply to a specific email.
 */
const sendReply = async (req, res) => {
  try {
    const { emailId, replyBody, subject } = req.body;
    const userId = req.user.id || req.user._id;
    
    if (!emailId || !replyBody) {
      return sendError(res, 'Missing required fields: emailId, replyBody', 400);
    }

    const originalEmail = await prisma.email.findFirst({ where: { id: emailId, userId } });
    if (!originalEmail) {
      return sendError(res, 'Original email not found', 404);
    }

    // Call Gmail Service to dispatch the raw email
    await gmailService.sendEmail(req.user, {
      to: originalEmail.senderEmail,
      subject: subject || `Re: ${originalEmail.subject}`,
      body: replyBody,
      threadId: originalEmail.threadId,
      inReplyTo: originalEmail.gmailMessageId,
      references: originalEmail.gmailMessageId
    });

    sendSuccess(res, 'Reply sent successfully.');
  } catch (error) {
    logger.error(`Send Reply Error: ${error.message}`);
    sendError(res, 'Failed to send reply.', 500);
  }
};

/**
 * Toggle Star
 */
const toggleStar = async (req, res) => {
  try {
    const { id } = req.params;
    const { isStarred } = req.body;
    const userId = req.user.id || req.user._id;

    const email = await prisma.email.findFirst({ where: { id, userId } });
    if (!email) return sendError(res, 'Email not found', 404);

    const addLabelIds = isStarred ? ['STARRED'] : [];
    const removeLabelIds = isStarred ? [] : ['STARRED'];
    
    await gmailService.modifyLabels(req.user, email.gmailMessageId, addLabelIds, removeLabelIds);
    
    let labels = email.labels;
    if (isStarred && !labels.includes('STARRED')) labels.push('STARRED');
    if (!isStarred) labels = labels.filter(l => l !== 'STARRED');
    
    const updatedEmail = await prisma.email.update({
      where: { id },
      data: { isStarred, labels }
    });

    sendSuccess(res, 'Star updated successfully', { email: updatedEmail });
  } catch (error) {
    logger.error(`Toggle Star Error: ${error.message}`);
    sendError(res, 'Failed to update star', 500);
  }
};

/**
 * Move to Trash
 */
const moveToTrash = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const email = await prisma.email.findFirst({ where: { id, userId } });
    if (!email) return sendError(res, 'Email not found', 404);

    await gmailService.modifyLabels(req.user, email.gmailMessageId, ['TRASH'], ['INBOX']);
    
    await prisma.email.update({
      where: { id },
      data: { folder: 'trash' }
    });
    
    sendSuccess(res, 'Email moved to trash');
  } catch (error) {
    logger.error(`Move To Trash Error: ${error.message}`);
    sendError(res, 'Failed to move to trash', 500);
  }
};

/**
 * Restore from Trash
 */
const restoreFromTrash = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const email = await prisma.email.findFirst({ where: { id, userId } });
    if (!email) return sendError(res, 'Email not found', 404);

    await gmailService.modifyLabels(req.user, email.gmailMessageId, ['INBOX'], ['TRASH']);
    
    await prisma.email.update({
      where: { id },
      data: { folder: 'inbox' }
    });
    
    sendSuccess(res, 'Email restored successfully');
  } catch (error) {
    logger.error(`Restore From Trash Error: ${error.message}`);
    sendError(res, 'Failed to restore email', 500);
  }
};

/**
 * Permanently Delete
 */
const permanentlyDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const email = await prisma.email.findFirst({ where: { id, userId } });
    if (!email) return sendError(res, 'Email not found', 404);

    await gmailService.deleteMessage(req.user, email.gmailMessageId);
    await prisma.email.delete({ where: { id } });
    
    sendSuccess(res, 'Email deleted permanently');
  } catch (error) {
    logger.error(`Permanently Delete Error: ${error.message}`);
    sendError(res, 'Failed to delete email', 500);
  }
};

/**
 * Update Draft
 */
const updateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { to, subject, body } = req.body;
    const userId = req.user.id || req.user._id;
    
    const email = await prisma.email.findFirst({ where: { id, userId } });
    if (!email) return sendError(res, 'Draft not found', 404);

    const data = await gmailService.updateDraft(req.user, email.gmailMessageId, { to, subject, body });
    
    let newGmailMessageId = email.gmailMessageId;
    if (data.message && data.message.id) {
      newGmailMessageId = data.message.id; 
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: {
        receiverEmail: to,
        subject,
        body,
        snippet: body.substring(0, 100),
        gmailMessageId: newGmailMessageId
      }
    });

    sendSuccess(res, 'Draft updated successfully', { email: updatedEmail });
  } catch (error) {
    logger.error(`Update Draft Error: ${error.message}`);
    sendError(res, 'Failed to update draft', 500);
  }
};

/**
 * Send Draft
 */
const sendDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const email = await prisma.email.findFirst({ where: { id, userId } });
    if (!email) return sendError(res, 'Draft not found', 404);

    await gmailService.sendDraft(req.user, email.gmailMessageId);
    
    await prisma.email.update({
      where: { id },
      data: { folder: 'sent' }
    });

    sendSuccess(res, 'Draft sent successfully');
  } catch (error) {
    logger.error(`Send Draft Error: ${error.message}`);
    sendError(res, 'Failed to send draft', 500);
  }
};

/**
 * Delete Draft
 */
const deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const email = await prisma.email.findFirst({ where: { id, userId } });
    if (!email) return sendError(res, 'Draft not found', 404);

    await gmailService.deleteDraft(req.user, email.gmailMessageId);
    await prisma.email.delete({ where: { id } });

    sendSuccess(res, 'Draft deleted successfully');
  } catch (error) {
    logger.error(`Delete Draft Error: ${error.message}`);
    sendError(res, 'Failed to delete draft', 500);
  }
};

/**
 * Bulk Actions handler
 */
const bulkAction = async (req, res) => {
  try {
    const { ids, action } = req.body;
    const userId = req.user.id || req.user._id;

    if (!ids || !ids.length || !action) {
      return sendError(res, 'Missing ids or action', 400);
    }

    const emails = await prisma.email.findMany({ where: { id: { in: ids }, userId } });
    if (!emails.length) return sendError(res, 'No emails found', 404);

    const gmailMessageIds = emails.map(e => e.gmailMessageId);
    let addLabelIds = [];
    let removeLabelIds = [];
    let updateFields = {};

    switch (action) {
      case 'archive':
        removeLabelIds = ['INBOX'];
        updateFields = { folder: 'archive' };
        break;
      case 'unarchive':
        addLabelIds = ['INBOX'];
        updateFields = { folder: 'inbox' };
        break;
      case 'trash':
        addLabelIds = ['TRASH'];
        removeLabelIds = ['INBOX'];
        updateFields = { folder: 'trash' };
        break;
      case 'restore':
        addLabelIds = ['INBOX'];
        removeLabelIds = ['TRASH'];
        updateFields = { folder: 'inbox' };
        break;
      case 'read':
        removeLabelIds = ['UNREAD'];
        updateFields = { isRead: true };
        break;
      case 'unread':
        addLabelIds = ['UNREAD'];
        updateFields = { isRead: false };
        break;
      case 'star':
        addLabelIds = ['STARRED'];
        updateFields = { isStarred: true };
        break;
      case 'unstar':
        removeLabelIds = ['STARRED'];
        updateFields = { isStarred: false };
        break;
      case 'spam':
        addLabelIds = ['SPAM'];
        removeLabelIds = ['INBOX'];
        updateFields = { folder: 'spam' };
        break;
      case 'unspam':
        addLabelIds = ['INBOX'];
        removeLabelIds = ['SPAM'];
        updateFields = { folder: 'inbox' };
        break;
      case 'important':
        addLabelIds = ['IMPORTANT'];
        break;
      case 'unimportant':
        removeLabelIds = ['IMPORTANT'];
        break;
      default:
        return sendError(res, 'Invalid action', 400);
    }

    await gmailService.batchModifyLabels(req.user, gmailMessageIds, addLabelIds, removeLabelIds);
    
    // Update local DB
    for (const email of emails) {
      let labels = [...email.labels];
      addLabelIds.forEach(l => { if (!labels.includes(l)) labels.push(l); });
      removeLabelIds.forEach(l => { labels = labels.filter(label => label !== l); });
      
      await prisma.email.update({
        where: { id: email.id },
        data: { ...updateFields, labels }
      });
    }

    sendSuccess(res, `Bulk action '${action}' applied successfully`);
  } catch (error) {
    logger.error(`Bulk Action Error: ${error.message}`);
    sendError(res, 'Failed to perform bulk action', 500);
  }
};

/**
 * Bulk Delete (Permanent)
 */
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id || req.user._id;

    if (!ids || !ids.length) return sendError(res, 'Missing ids', 400);

    const emails = await prisma.email.findMany({ where: { id: { in: ids }, userId } });
    if (!emails.length) return sendError(res, 'No emails found', 404);

    const gmailMessageIds = emails.map(e => e.gmailMessageId);
    
    await gmailService.batchDeleteMessages(req.user, gmailMessageIds);
    await prisma.email.deleteMany({ where: { id: { in: ids } } });

    sendSuccess(res, 'Bulk delete successful');
  } catch (error) {
    logger.error(`Bulk Delete Error: ${error.message}`);
    sendError(res, 'Failed to perform bulk delete', 500);
  }
};

module.exports = {
  syncEmails,
  getInbox,
  getPriority: (req, res) => getCategorizedEmails(req, res, 'Priority'),
  getTeam: (req, res) => getCategorizedEmails(req, res, 'Team'),
  getSent,
  getDrafts,
  getStarred,
  getSpam,
  getTrash,
  getArchive,
  getEmailById,
  sendReply,
  toggleStar,
  moveToTrash,
  restoreFromTrash,
  permanentlyDelete,
  updateDraft,
  sendDraft,
  deleteDraft,
  bulkAction,
  bulkDelete
};

