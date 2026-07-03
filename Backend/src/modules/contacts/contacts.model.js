const mongoose = require('mongoose');

const contactsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['Priority', 'Team', 'Others', 'Spam', 'Unknown'],
    default: 'Unknown'
  },
  interactionCount: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

// Prevent duplicate contacts per user
contactsSchema.index({ user: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Contacts', contactsSchema);
