const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');

// Test endpoints for Groq Integration
router.post('/summarize', aiController.summarizeEmail);
router.post('/reply', aiController.generateReply);
router.post('/suggestions', aiController.generateSuggestions);

module.exports = router;
