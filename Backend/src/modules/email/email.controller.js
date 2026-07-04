const Email = require('./email.model');
const gmailService = require('./gmail.service');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const User = require('../user/user.model');
const mongoose = require('mongoose');

const emailService = require('./email.service');

/**
 * Trigger a Gmail Sync to fetch latest emails and store in DB.
 */
const syncEmails = async (req, res) => {
  try {
    const user = req.user;
    const isDevUser = user.email === 'dev@example.com' || user.provider === 'dev';
    
    if (mongoose.connection.readyState !== 1 || isDevUser) {
      logger.warn('Email Sync bypassed (Offline Mode or Developer User).');
      return sendSuccess(res, 'Developer Mode Sync Simulated.', { syncedCount: 0 });
    }

    if (!user.gmailAccessToken) {
      return sendError(res, 'Google OAuth credentials missing.', 401);
    }

    // Call the dedicated service that handles AI classification and storage
    const syncedEmails = await emailService.syncEmails(user._id);

    // Update user sync time
    await User.findByIdAndUpdate(user._id, { lastSyncAt: new Date() });

    sendSuccess(res, 'Emails synced successfully.', {
      syncedCount: syncedEmails.length,
      upsertedCount: syncedEmails.length,
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
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = { userId };
    
    if (folder === 'starred') {
      query.isStarred = true;
      // Do not query by folder for starred, since it can be in inbox, sent, etc.
    } else {
      query.folder = folder;
    }
    
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { receiverEmail: { $regex: search, $options: 'i' } },
        { senderEmail: { $regex: search, $options: 'i' } },
        { senderName: { $regex: search, $options: 'i' } },
        { snippet: { $regex: search, $options: 'i' } }
      ];
    }
    
    const [emails, total] = await Promise.all([
      Email.find(query)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-htmlBody -body'), // Exclude full body for list views
      Email.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        emails,
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
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const matchQuery = { userId, folder: 'inbox' };
    if (category !== 'Priority') {
      matchQuery.aiCategory = category;
    }

    const pipeline = [
      { $match: matchQuery },
      { $sort: { globalPriorityRank: 1, receivedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { htmlBody: 0, body: 0 } }
    ];

    const emails = await Email.aggregate(pipeline);
    const total = await Email.countDocuments(matchQuery);

    res.status(200).json({
      success: true,
      data: {
        emails,
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
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const matchQuery = { userId, folder: 'inbox' };
    
    if (search) {
      matchQuery.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { receiverEmail: { $regex: search, $options: 'i' } },
        { senderEmail: { $regex: search, $options: 'i' } },
        { senderName: { $regex: search, $options: 'i' } },
        { snippet: { $regex: search, $options: 'i' } }
      ];
    }

    const pipeline = [
      { $match: matchQuery },
      { $sort: { globalPriorityRank: 1, receivedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { htmlBody: 0, body: 0 } }
    ];

    const emails = await Email.aggregate(pipeline);
    const total = await Email.countDocuments(matchQuery);

    res.status(200).json({
      success: true,
      data: {
        emails,
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
    
    if (mongoose.connection.readyState !== 1) {
      return sendError(res, 'Database unavailable.', 503);
    }

    const email = await Email.findOne({ _id: id, userId: req.user._id });
    if (!email) {
      return sendError(res, 'Email not found', 404);
    }

    // Mark as read if it was unread
    if (!email.isRead) {
      email.isRead = true;
      await email.save();
    }

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
    
    if (!emailId || !replyBody) {
      return sendError(res, 'Missing required fields: emailId, replyBody', 400);
    }

    const originalEmail = await Email.findOne({ _id: emailId, userId: req.user._id });
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
    const email = await Email.findOne({ _id: id, userId: req.user._id });
    if (!email) return sendError(res, 'Email not found', 404);

    const addLabelIds = isStarred ? ['STARRED'] : [];
    const removeLabelIds = isStarred ? [] : ['STARRED'];
    
    await gmailService.modifyLabels(req.user, email.gmailMessageId, addLabelIds, removeLabelIds);
    
    email.isStarred = isStarred;
    if (isStarred && !email.labels.includes('STARRED')) email.labels.push('STARRED');
    if (!isStarred) email.labels = email.labels.filter(l => l !== 'STARRED');
    
    await email.save();
    sendSuccess(res, 'Star updated successfully', { email });
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
    const email = await Email.findOne({ _id: id, userId: req.user._id });
    if (!email) return sendError(res, 'Email not found', 404);

    await gmailService.modifyLabels(req.user, email.gmailMessageId, ['TRASH'], ['INBOX']);
    email.folder = 'trash';
    await email.save();
    
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
    const email = await Email.findOne({ _id: id, userId: req.user._id });
    if (!email) return sendError(res, 'Email not found', 404);

    await gmailService.modifyLabels(req.user, email.gmailMessageId, ['INBOX'], ['TRASH']);
    email.folder = 'inbox'; 
    await email.save();
    
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
    const email = await Email.findOne({ _id: id, userId: req.user._id });
    if (!email) return sendError(res, 'Email not found', 404);

    await gmailService.deleteMessage(req.user, email.gmailMessageId);
    await Email.deleteOne({ _id: id });
    
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
    
    const email = await Email.findOne({ _id: id, userId: req.user._id });
    if (!email) return sendError(res, 'Draft not found', 404);

    const data = await gmailService.updateDraft(req.user, email.gmailMessageId, { to, subject, body });
    
    // Update local copy
    email.receiverEmail = to;
    email.subject = subject;
    email.body = body;
    email.snippet = body.substring(0, 100);
    // Draft updates might return a new message ID inside the draft object
    if (data.message && data.message.id) {
      email.gmailMessageId = data.message.id; 
    }
    await email.save();

    sendSuccess(res, 'Draft updated successfully', { email });
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
    const email = await Email.findOne({ _id: id, userId: req.user._id });
    if (!email) return sendError(res, 'Draft not found', 404);

    await gmailService.sendDraft(req.user, email.gmailMessageId);
    
    email.folder = 'sent';
    await email.save();

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
    const email = await Email.findOne({ _id: id, userId: req.user._id });
    if (!email) return sendError(res, 'Draft not found', 404);

    await gmailService.deleteDraft(req.user, email.gmailMessageId);
    await Email.deleteOne({ _id: id });

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
    if (!ids || !ids.length || !action) {
      return sendError(res, 'Missing ids or action', 400);
    }

    const emails = await Email.find({ _id: { $in: ids }, userId: req.user._id });
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
      Object.assign(email, updateFields);
      addLabelIds.forEach(l => { if (!email.labels.includes(l)) email.labels.push(l); });
      removeLabelIds.forEach(l => { email.labels = email.labels.filter(label => label !== l); });
      await email.save();
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
    if (!ids || !ids.length) return sendError(res, 'Missing ids', 400);

    const emails = await Email.find({ _id: { $in: ids }, userId: req.user._id });
    if (!emails.length) return sendError(res, 'No emails found', 404);

    const gmailMessageIds = emails.map(e => e.gmailMessageId);
    
    await gmailService.batchDeleteMessages(req.user, gmailMessageIds);
    await Email.deleteMany({ _id: { $in: ids } });

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
