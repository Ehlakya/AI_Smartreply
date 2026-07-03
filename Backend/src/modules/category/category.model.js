const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    enum: ['Priority', 'Team', 'Others', 'Spam']
  },
  subCategory: {
    type: String,
    // E.g., CEO, Manager, HR for Priority. Developers, Designers for Team.
  },
  keywords: [{
    type: String
  }],
  color: {
    type: String,
    default: '#cccccc'
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
