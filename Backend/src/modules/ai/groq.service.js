const Groq = require('groq-sdk');
const env = require('../../config/env');
const logger = require('../../shared/utils/logger');

let groq = null;
if (env.GROQ_API_KEY && !env.GROQ_API_KEY.includes('paste-')) {
  groq = new Groq({ apiKey: env.GROQ_API_KEY });
}

/**
 * Handles Groq API calls with built-in retry and timeout logic.
 */
const callGroqAPI = async (prompt, systemPrompt = 'You are a helpful AI assistant.', maxTokens = 1024) => {
  if (!groq) {
    logger.warn('Groq API Key is missing. AI features are disabled.');
    return { success: false, message: 'Groq API Key is missing.' };
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Groq API Timeout after 30 seconds')), 30000)
  );

  const fetchPromise = async () => {
    let retries = 3;
    while (retries > 0) {
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
        retries -= 1;
        logger.error(`Groq API Error (${error.status || error.name}): ${error.message}`);
        
        // If it's a hard fail (not a 429 or 503), break out
        if (error.status && ![429, 500, 503].includes(error.status)) {
          break;
        }

        if (retries === 0) break;
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return { success: false, message: 'Unable to generate AI response.' };
  };

  try {
    return await Promise.race([fetchPromise(), timeoutPromise]);
  } catch (error) {
    logger.error(`Groq API Race Error: ${error.message}`);
    return { success: false, message: 'Unable to generate AI response.' };
  }
};

/**
 * Summarize a long email professionally.
 */
const summarizeEmail = async (emailContent) => {
  const systemPrompt = 'You are a professional assistant. Summarize the following email in 2-3 concise sentences.';
  return await callGroqAPI(emailContent, systemPrompt, 150);
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
  return await callGroqAPI(emailContent, systemPrompt, 500);
};

/**
 * Generate 3 smart quick reply suggestions.
 */
const generateSuggestions = async (emailContent) => {
  const systemPrompt = `You are a smart reply generator. Read the email and generate exactly 3 short, distinct reply options (under 10 words each). Separate them with the "|" character. Return ONLY the options.`;
  const result = await callGroqAPI(emailContent, systemPrompt, 100);
  
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
  return await callGroqAPI(replyDraft, systemPrompt, 500);
};

/**
 * Translate a reply into a target language.
 */
const translateReply = async (replyText, language) => {
  const systemPrompt = `Translate the following email reply into ${language}. Keep the professional tone intact. Return ONLY the translated text.`;
  return await callGroqAPI(replyText, systemPrompt, 500);
};

module.exports = {
  summarizeEmail,
  generateReply,
  generateSuggestions,
  improveReply,
  translateReply
};
