const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: String,
  mimeType: String,
  attachmentId: String,
  size: Number
}, { _id: false });

const emailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  gmailMessageId: {
    type: String,
    required: true,
    unique: true
  },
  threadId: {
    type: String,
    required: true,
    index: true
  },
  senderName: {
    type: String,
    default: ''
  },
  senderEmail: {
    type: String,
    required: true
  },
  receiverEmail: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: '(No Subject)'
  },
  snippet: {
    type: String,
    default: ''
  },
  body: {
    type: String,
    default: '' // Plain text
  },
  htmlBody: {
    type: String,
    default: ''
  },
  labels: [{
    type: String
  }],
  attachments: [attachmentSchema],
  receivedAt: {
    type: Date,
    required: true,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  folder: {
    type: String,
    enum: ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive'],
    default: 'inbox',
    index: true
  }
}, { timestamps: true });

// Compound index for efficient querying
emailSchema.index({ userId: 1, folder: 1, receivedAt: -1 });

module.exports = mongoose.model('Email', emailSchema);
