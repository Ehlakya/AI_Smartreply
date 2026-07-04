const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  replyTone: {
    type: String,
    enum: ['Professional', 'Friendly', 'Formal', 'Quick', 'Detailed', 'Meeting', 'Apology', 'Thank You'],
    default: 'Professional'
  },
  signature: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'English'
  },
  autoCategorization: {
    type: Boolean,
    default: true
  },
  autoSync: {
    type: Boolean,
    default: false
  },
  autoSyncIntervalMinutes: {
    type: Number,
    default: 15
  },
  companyDomain: {
    type: String,
    default: ''
  },
  teamMembers: [{
    type: String
  }],
  departmentKeywords: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
