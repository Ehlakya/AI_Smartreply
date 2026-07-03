const { google } = require('googleapis');
const env = require('../../config/env');
const logger = require('../../shared/utils/logger');

/**
 * Initialize a Gmail API client for a specific user.
 * It will automatically refresh the access token if expired, provided a refresh token exists.
 */
const createGmailClient = (user) => {
  const oAuth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  oAuth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken
  });

  // Listen for automatic token refreshes and update the user model
  oAuth2Client.on('tokens', (tokens) => {
    if (tokens.access_token) user.gmailAccessToken = tokens.access_token;
    if (tokens.refresh_token) user.gmailRefreshToken = tokens.refresh_token;
    user.save().catch(err => logger.error('Failed to save refreshed tokens:', err));
  });

  return google.gmail({ version: 'v1', auth: oAuth2Client });
};

/**
 * Decode Base64 string, handling URL-safe encoding used by Gmail.
 */
const decodeBase64 = (data) => {
  if (!data) return '';
  return Buffer.from(data, 'base64url').toString('utf-8');
};

/**
 * Recursively parse the Gmail payload parts to extract plain text and HTML.
 */
const parseMessageBody = (payload) => {
  let body = '';
  let htmlBody = '';

  const parseParts = (parts) => {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        body += decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
        htmlBody += decodeBase64(part.body.data);
      } else if (part.parts) {
        parseParts(part.parts);
      }
    }
  };

  if (payload.parts) {
    parseParts(payload.parts);
  } else if (payload.body && payload.body.data) {
    // Top level body (simple message)
    if (payload.mimeType === 'text/plain') body = decodeBase64(payload.body.data);
    else if (payload.mimeType === 'text/html') htmlBody = decodeBase64(payload.body.data);
  }

  return { body, htmlBody };
};

/**
 * Extract attachments from payload parts.
 */
const extractAttachments = (payload) => {
  const attachments = [];
  
  const searchParts = (parts) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.filename.length > 0 && part.body && part.body.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          attachmentId: part.body.attachmentId,
          size: part.body.size
        });
      }
      if (part.parts) searchParts(part.parts);
    }
  };
  
  searchParts(payload.parts);
  return attachments;
};

/**
 * Parse headers to extract standard fields.
 */
const parseHeaders = (headers) => {
  const parsed = {};
  for (const header of headers) {
    const name = header.name.toLowerCase();
    if (['from', 'to', 'subject', 'date'].includes(name)) {
      parsed[name] = header.value;
    }
  }
  return parsed;
};

/**
 * Format the raw Gmail message into our DB Schema format.
 */
const formatEmailForDB = (message, userId) => {
  const headers = parseHeaders(message.payload.headers);
  const { body, htmlBody } = parseMessageBody(message.payload);
  const attachments = extractAttachments(message.payload);

  // Extract Sender Name and Email from the "From" header (e.g. "John Doe <john@example.com>")
  let senderName = '';
  let senderEmail = headers.from || '';
  
  const fromRegex = /(.*)<(.+)>$/;
  const match = senderEmail.match(fromRegex);
  if (match) {
    senderName = match[1].trim().replace(/"/g, ''); // Remove quotes
    senderEmail = match[2].trim();
  }

  // Determine standard folder based on labels
  let folder = 'inbox';
  const labels = message.labelIds || [];
  if (labels.includes('SENT')) folder = 'sent';
  else if (labels.includes('DRAFT')) folder = 'drafts';
  else if (labels.includes('TRASH')) folder = 'trash';
  else if (labels.includes('SPAM')) folder = 'spam';
  else if (!labels.includes('INBOX')) folder = 'archive';

  return {
    userId,
    gmailMessageId: message.id,
    threadId: message.threadId,
    senderName,
    senderEmail,
    receiverEmail: headers.to || '',
    subject: headers.subject || '(No Subject)',
    snippet: message.snippet || '',
    body: body.trim(),
    htmlBody: htmlBody.trim(),
    labels: message.labelIds || [],
    attachments,
    receivedAt: new Date(headers.date || Date.now()),
    isRead: !labels.includes('UNREAD'),
    isStarred: labels.includes('STARRED'),
    folder
  };
};

/**
 * Fetch and sync recent emails for a user.
 */
const syncRecentEmails = async (user, maxResults = 50) => {
  try {
    const gmail = createGmailClient(user);
    
    // 1. Fetch message list
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: maxResults,
      q: '' // Can be used to filter
    });
    
    const messages = listRes.data.messages;
    if (!messages || messages.length === 0) {
      return [];
    }

    const emailDocuments = [];

    // 2. Fetch full message details for each ID
    for (const msg of messages) {
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });
      
      const formatted = formatEmailForDB(msgRes.data, user._id);
      emailDocuments.push(formatted);
    }
    
    return emailDocuments;
  } catch (error) {
    logger.error(`Gmail Sync Error for user ${user._id}: ${error.message}`);
    throw error;
  }
};

/**
 * Send an email (optionally as a reply to a thread).
 */
const sendEmail = async (user, { to, subject, body, threadId, inReplyTo, references }) => {
  try {
    const gmail = createGmailClient(user);
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    const messageParts = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
    ];
    
    if (inReplyTo) {
      messageParts.push(`In-Reply-To: ${inReplyTo}`);
      messageParts.push(`References: ${references || inReplyTo}`);
    }
    
    messageParts.push('');
    messageParts.push(body);
    
    const message = messageParts.join('\r\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
      
    const requestBody = { raw: encodedMessage };
    if (threadId) requestBody.threadId = threadId;

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody
    });
    
    return res.data;
  } catch (error) {
    logger.error(`Gmail Send Error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createGmailClient,
  syncRecentEmails,
  sendEmail
};
