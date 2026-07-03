const mongoose = require('mongoose');

const aiHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email'
  },
  actionType: {
    type: String,
    enum: ['Summarize', 'Reply', 'Regenerate', 'Classify', 'SpamCheck'],
    required: true
  },
  promptUsed: {
    type: String
  },
  aiResponse: {
    type: String,
    required: true
  },
  tokensUsed: {
    type: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('AIHistory', aiHistorySchema);
