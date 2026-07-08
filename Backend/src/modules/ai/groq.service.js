const Groq = require('groq-sdk');
const env = require('../../config/env');
const logger = require('../../shared/utils/logger');
const crypto = require('crypto');

let groq = null;
if (env.GROQ_API_KEY && !env.GROQ_API_KEY.includes('paste-')) {
  groq = new Groq({ apiKey: env.GROQ_API_KEY });
}

// ---------------------------------------------------------
// Cache and Queue Infrastructure
// ---------------------------------------------------------
const AI_CACHE = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const IN_FLIGHT_PROMISES = new Map();

// Simple Task Queue
class ConcurrencyQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.dequeue();
    });
  }

  async dequeue() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }
    this.running++;
    const { task, resolve, reject } = this.queue.shift();
    try {
      logger.info(`[Queue] Starting task. Active: ${this.running}, Queued: ${this.queue.length}`);
      const startTime = Date.now();
      const result = await task();
      logger.info(`[Queue] Task finished in ${Date.now() - startTime}ms.`);
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.running--;
      this.dequeue();
    }
  }
}

const groqQueue = new ConcurrencyQueue(2);

// Optimize Token Usage Utility
const cleanTextForAI = (text) => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '') // strip basic html tags if any
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // replace 3+ newlines with 2
    .trim()
    .substring(0, 15000); // hard cap length to prevent overwhelming tokens
};

const generateCacheKey = (prompt, systemPrompt) => {
  return crypto.createHash('sha256').update(systemPrompt + '|' + prompt).digest('hex');
};

/**
 * Internal: Handles Groq API calls with built-in retry and timeout logic.
 */
const _executeGroqCall = async (prompt, systemPrompt, maxTokens) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Groq API Timeout after 30 seconds')), 30000)
  );

  const fetchPromise = async () => {
    let retries = 0;
    const maxRetries = 3;
    const backoffs = [2000, 4000, 8000]; // Exponential backoff requirements

    while (retries <= maxRetries) {
      try {
        const response = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          model: env.GROQ_MODEL,
          max_tokens: maxTokens,
          temperature: 0.5
        });
        
        return { success: true, data: response.choices[0].message.content.trim() };
      } catch (error) {
        logger.error(`Groq API Error (${error.status || error.name}): ${error.message}`);
        
        // If it's a 429 or 503, apply backoff
        if (error.status === 429 || error.status === 503) {
          if (retries >= maxRetries) {
            logger.error(`Groq API: Exhausted ${maxRetries} retries.`);
            return { success: false, message: 'Rate limit exceeded. Please try again later.', isRateLimit: true };
          }
          const waitTime = backoffs[retries];
          logger.info(`Groq API Rate Limited. Retrying in ${waitTime}ms... (Attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
        } else {
          // Hard fail for other errors
          return { success: false, message: 'Unable to generate AI response.' };
        }
      }
    }
  };

  try {
    return await Promise.race([fetchPromise(), timeoutPromise]);
  } catch (error) {
    logger.error(`Groq API Race Error: ${error.message}`);
    return { success: false, message: 'Unable to generate AI response.' };
  }
};

/**
 * Public facing API call wrapper (adds Cache, Queueing, and Locking)
 */
const callGroqAPI = async (rawPrompt, systemPrompt = 'You are a helpful AI assistant.', maxTokens = 1024, useCache = false) => {
  if (!groq) {
    logger.warn('Groq API Key is missing. AI features are disabled.');
    return { success: false, message: 'Groq API Key is missing.' };
  }

  const prompt = cleanTextForAI(rawPrompt);
  const cacheKey = generateCacheKey(prompt, systemPrompt);

  if (useCache) {
    const cached = AI_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      logger.info(`[Cache] HIT for AI Request`);
      return cached.result;
    }
  }

  if (IN_FLIGHT_PROMISES.has(cacheKey)) {
    logger.info(`[Queue] Deduplicating identical in-flight request.`);
    return IN_FLIGHT_PROMISES.get(cacheKey);
  }

  const promise = groqQueue.enqueue(() => _executeGroqCall(prompt, systemPrompt, maxTokens));
  IN_FLIGHT_PROMISES.set(cacheKey, promise);

  try {
    const result = await promise;
    if (result.success && useCache) {
      AI_CACHE.set(cacheKey, { result, timestamp: Date.now() });
    }
    return result;
  } finally {
    IN_FLIGHT_PROMISES.delete(cacheKey);
  }
};

// ---------------------------------------------------------
// Exported API Functions
// ---------------------------------------------------------

/**
 * Summarize a long email professionally.
 */
const summarizeEmail = async (emailContent) => {
  const systemPrompt = 'You are a professional assistant. Summarize the following email in 2-3 concise sentences.';
  return await callGroqAPI(emailContent, systemPrompt, 150, true); // Cache summaries
};

/**
 * Generate a reply based on tone or intent.
 */
const generateReply = async (emailContent, tone) => {
  const systemPrompt = `You are a highly capable executive assistant. Generate a response to the provided email matching this exact tone or intent: "${tone}". 
If the intent is a "Meeting Confirmation", explicitly confirm the meeting time/date proposed in the email.
If the intent is a "Thank You", express gratitude clearly.
If the intent is an "Apology", express sincere apologies for any delays or issues.
Return ONLY the raw email reply text. Do not include headers (like Subject or To). Do not include conversational filler like 'Here is your draft:'.`;
  return await callGroqAPI(emailContent, systemPrompt, 500, false); // Don't cache replies since users might want slightly different regenerations
};

/**
 * Generate 3 smart quick reply suggestions.
 */
const generateSuggestions = async (emailContent) => {
  const systemPrompt = `You are a smart reply generator. Read the email and generate exactly 3 short, distinct reply options (under 10 words each). Separate them with the "|" character. Return ONLY the options.`;
  const result = await callGroqAPI(emailContent, systemPrompt, 100, true); // Cache suggestions
  
  if (result.success) {
    const suggestions = result.data.split('|').map(s => s.trim()).filter(s => s.length > 0);
    return { success: true, data: suggestions };
  }
  return result;
};

/**
 * Improve the grammar and clarity of a drafted reply.
 */
const improveReply = async (replyDraft) => {
  const systemPrompt = `You are an expert editor. Improve the grammar, clarity, and professionalism of the following email draft. Return ONLY the improved draft.`;
  return await callGroqAPI(replyDraft, systemPrompt, 500, false);
};

/**
 * Translate a reply into a target language.
 */
const translateReply = async (replyText, language) => {
  const systemPrompt = `Translate the following email reply into ${language}. Keep the professional tone intact. Return ONLY the translated text.`;
  return await callGroqAPI(replyText, systemPrompt, 500, true);
};

/**
 * Refine a draft reply based on specific instructions.
 */
const refineReply = async (replyDraft, instruction) => {
  const systemPrompt = `You are an expert editor. Modify the following email draft according to this exact instruction: "${instruction}". 
Return ONLY the modified draft without any conversational filler or formatting tags.`;
  return await callGroqAPI(replyDraft, systemPrompt, 800, false);
};

/**
 * Analyze email for importance (High, Medium, Low), Reason, and Confidence.
 */
const analyzeEmailImportance = async (emailContent, isTeamMail = false) => {
  const context = isTeamMail 
    ? 'This is a Team Mail. High priority: Project blockers, urgent bugs, production issues, immediate approvals. Medium: Daily updates, progress reports, code reviews. Low: Greetings, FYI, casual chats, brief replies.'
    : 'This is a General/Priority Mail. High priority: Interview, Job Offer, Urgent Deadline, Important Project, Client Escalation, Salary, Invoice, Production Issue, Security Alert. Medium priority: Standard business communications, formal follow-ups. Low priority: Promotions, marketing, shopping, newsletters, spam, casual conversations, simple scheduling (e.g. "when works for you"), short replies, brief follow-ups, unwanted emails.';
    
  const systemPrompt = `You are an intelligent email analyzer. ${context}
Analyze the provided email and output ONLY a valid JSON object with the following structure exactly:
{
  "priority": "High" | "Medium" | "Low",
  "reason": "A 1-2 sentence explanation of why this priority was chosen",
  "confidence": <a number between 0 and 100>
}
Do not include markdown tags like \`\`\`json or \`\`\`. Output just the raw JSON string.`;

  const result = await callGroqAPI(emailContent, systemPrompt, 200, true); // Extremely important to cache analysis
  
  if (result.success) {
    try {
      const parsed = JSON.parse(result.data);
      return { success: true, data: parsed };
    } catch (e) {
      logger.error('Failed to parse AI importance analysis JSON: ' + result.data);
      // Fallback
      return { success: true, data: { priority: 'Medium', reason: 'Failed to parse AI response. Defaulting to Medium.', confidence: 50 }};
    }
  }
  return result;
};

module.exports = {
  summarizeEmail,
  generateReply,
  generateSuggestions,
  improveReply,
  translateReply,
  refineReply,
  analyzeEmailImportance
};
