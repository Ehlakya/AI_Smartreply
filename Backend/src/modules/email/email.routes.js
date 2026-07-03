const express = require('express');
const router = express.Router();
const emailController = require('./email.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

// Apply auth middleware to all email routes
router.use(authMiddleware);

// Sync
router.post('/sync', emailController.syncEmails);

// Folders
router.get('/inbox', emailController.getInbox);
router.get('/sent', emailController.getSent);
router.get('/drafts', emailController.getDrafts);
router.get('/starred', emailController.getStarred);
router.get('/spam', emailController.getSpam);
router.get('/trash', emailController.getTrash);

// Single Email Details
router.get('/:id', emailController.getEmailById);

// Send Reply
router.post('/reply', emailController.sendReply);

module.exports = router;
