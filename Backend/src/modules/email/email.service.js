const { createGmailClient } = require('../../config/gmail');
const Email = require('./email.model');
const User = require('../user/user.model');
const logger = require('../../shared/utils/logger');

const syncEmails = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.gmailAccessToken) {
      throw new Error('User not connected to Gmail or tokens missing');
    }

    const gmail = createGmailClient(user);
    
    // Fetch last 50 emails to prevent rate limits on initial sync
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      labelIds: ['INBOX']
    });

    const messages = response.data.messages;
    if (!messages) {
      logger.info('No new messages found.');
      return [];
    }

    const savedEmails = [];

    for (const msg of messages) {
      // Check if email already exists to prevent duplicates
      const existing = await Email.findOne({ messageId: msg.id });
      if (existing) continue;

      // Fetch email details
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date']
      });

      const headers = detail.data.payload.headers;
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const fromHeader = getHeader('From');
      const senderNameMatch = fromHeader.split('<')[0].trim();
      const senderEmailMatch = fromHeader.match(/<(.+)>/)?.[1] || fromHeader;

      const emailData = {
        user: userId,
        messageId: detail.data.id,
        threadId: detail.data.threadId,
        senderName: senderNameMatch,
        senderEmail: senderEmailMatch,
        receiver: getHeader('To'),
        subject: getHeader('Subject') || 'No Subject',
        snippet: detail.data.snippet,
        labels: detail.data.labelIds || [],
        readStatus: !(detail.data.labelIds || []).includes('UNREAD'),
        starred: (detail.data.labelIds || []).includes('STARRED'),
        spamStatus: (detail.data.labelIds || []).includes('SPAM'),
        receivedTime: new Date(getHeader('Date')),
      };

      const newEmail = await Email.create(emailData);
      savedEmails.push(newEmail);
    }

    logger.info(`Successfully synced ${savedEmails.length} new emails for user ${userId}`);
    return savedEmails;
  } catch (error) {
    logger.error('Error syncing emails:', error);
    throw error;
  }
};

module.exports = {
  syncEmails
};
