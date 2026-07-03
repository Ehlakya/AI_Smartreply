const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  picture: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  refreshToken: {
    type: String
  },
  gmailAccessToken: {
    type: String
  },
  gmailRefreshToken: {
    type: String
  },
  lastSyncAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
