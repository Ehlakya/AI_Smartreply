const Email = require('./email.model');
const gmailService = require('./gmail.service');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const User = require('../user/user.model');
const mongoose = require('mongoose');

/**
 * Trigger a Gmail Sync to fetch latest emails and store in DB.
 */
const syncEmails = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.gmailAccessToken) {
      return sendError(res, 'Google OAuth credentials missing.', 401);
    }

    // Fetch up to 50 latest emails
    const emailsToSync = await gmailService.syncRecentEmails(user, 50);

    if (emailsToSync.length === 0) {
      return sendSuccess(res, 'No new emails to sync.', { syncedCount: 0 });
    }

    // Bulk upsert into MongoDB
    const bulkOps = emailsToSync.map(emailData => ({
      updateOne: {
        filter: { userId: user._id, gmailMessageId: emailData.gmailMessageId },
        update: { $set: emailData },
        upsert: true
      }
    }));

    const result = await Email.bulkWrite(bulkOps);

    // Update user sync time
    await User.findByIdAndUpdate(user._id, { lastSyncAt: new Date() });

    sendSuccess(res, 'Emails synced successfully.', {
      syncedCount: emailsToSync.length,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount
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
    const skip = (page - 1) * limit;

    const query = { userId, folder };
    
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

const getInbox = (req, res) => getEmailsByFolder(req, res, 'inbox');
const getSent = (req, res) => getEmailsByFolder(req, res, 'sent');
const getDrafts = (req, res) => getEmailsByFolder(req, res, 'drafts');
const getStarred = (req, res) => getEmailsByFolder(req, res, 'starred');
const getSpam = (req, res) => getEmailsByFolder(req, res, 'spam');
const getTrash = (req, res) => getEmailsByFolder(req, res, 'trash');

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

module.exports = {
  syncEmails,
  getInbox,
  getSent,
  getDrafts,
  getStarred,
  getSpam,
  getTrash,
  getEmailById,
  sendReply
};
