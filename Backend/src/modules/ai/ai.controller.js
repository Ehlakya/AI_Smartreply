const groqService = require('./groq.service');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

/**
 * Handle POST /api/ai/summarize
 * Body: { emailContent: string }
 */
const summarizeEmail = async (req, res) => {
  try {
    const { emailContent } = req.body;
    if (!emailContent) return sendError(res, 'Email content is required.', 400);

    const result = await groqService.summarizeEmail(emailContent);
    if (!result.success) {
      if (result.isRateLimit) return res.status(200).json({ success: false, message: result.message, isRateLimit: true });
      return res.status(503).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      summary: result.data
    });
  } catch (error) {
    logger.error(`Summarize Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Unable to generate AI response.' });
  }
};

/**
 * Handle POST /api/ai/reply
 * Body: { emailContent: string, tone?: string }
 */
const generateReply = async (req, res) => {
  try {
    const { emailContent, tone = 'Professional' } = req.body;
    if (!emailContent) return sendError(res, 'Email content is required.', 400);

    const result = await groqService.generateReply(emailContent, tone);
    if (!result.success) {
      if (result.isRateLimit) return res.status(200).json({ success: false, message: result.message, isRateLimit: true });
      return res.status(503).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      reply: result.data
    });
  } catch (error) {
    logger.error(`Reply Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Unable to generate AI response.' });
  }
};

/**
 * Handle POST /api/ai/suggestions
 * Body: { emailContent: string }
 */
const generateSuggestions = async (req, res) => {
  try {
    const { emailContent } = req.body;
    if (!emailContent) return sendError(res, 'Email content is required.', 400);

    const result = await groqService.generateSuggestions(emailContent);
    if (!result.success) {
      if (result.isRateLimit) return res.status(200).json({ success: false, message: result.message, isRateLimit: true });
      return res.status(503).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      suggestions: result.data
    });
  } catch (error) {
    logger.error(`Suggestions Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Unable to generate AI response.' });
  }
};

/**
 * Handle POST /api/ai/refine
 * Body: { draft: string, instruction: string }
 */
const refineReply = async (req, res) => {
  try {
    const { draft, instruction } = req.body;
    if (!draft || !instruction) return sendError(res, 'Draft and instruction are required.', 400);

    const result = await groqService.refineReply(draft, instruction);
    if (!result.success) {
      if (result.isRateLimit) return res.status(200).json({ success: false, message: result.message, isRateLimit: true });
      return res.status(503).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      reply: result.data
    });
  } catch (error) {
    logger.error(`Refine Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Unable to refine AI response.' });
  }
};

module.exports = {
  summarizeEmail,
  generateReply,
  generateSuggestions,
  refineReply
};
