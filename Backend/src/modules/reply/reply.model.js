const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email',
    required: true
  },
  generatedContent: {
    type: String,
    required: true
  },
  editedContent: {
    type: String
  },
  tone: {
    type: String
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Discarded'],
    default: 'Draft'
  },
  sentAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Reply', replySchema);
