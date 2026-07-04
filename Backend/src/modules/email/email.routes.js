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
router.get('/priority', emailController.getPriority);
router.get('/team', emailController.getTeam);
router.get('/sent', emailController.getSent);
router.get('/drafts', emailController.getDrafts);
router.get('/starred', emailController.getStarred);
router.get('/spam', emailController.getSpam);
router.get('/trash', emailController.getTrash);
router.get('/archive', emailController.getArchive);

// Bulk Actions
router.post('/bulk-action', emailController.bulkAction);
router.post('/bulk-delete', emailController.bulkDelete);

// Single Email Details
router.get('/:id', emailController.getEmailById);

// Send Reply
router.post('/reply', emailController.sendReply);

// Actions
router.put('/:id/star', emailController.toggleStar);
router.put('/:id/trash', emailController.moveToTrash);
router.put('/:id/restore', emailController.restoreFromTrash);
router.delete('/:id', emailController.permanentlyDelete);

// Drafts
router.post('/:id/send-draft', emailController.sendDraft);
router.put('/:id/draft', emailController.updateDraft);
router.delete('/:id/draft', emailController.deleteDraft);

module.exports = router;
