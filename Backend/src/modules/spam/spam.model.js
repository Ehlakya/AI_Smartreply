const mongoose = require('mongoose');

const spamSchema = new mongoose.Schema({
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
  spamScore: {
    type: Number,
    min: 0,
    max: 100
  },
  reasons: [{
    type: String
  }],
  source: {
    type: String,
    enum: ['AI', 'GmailLabel', 'KeywordMatch', 'SenderReputation']
  },
  isConfirmed: {
    type: Boolean,
    default: false // Whether user confirmed it as spam
  }
}, { timestamps: true });

module.exports = mongoose.model('Spam', spamSchema);
