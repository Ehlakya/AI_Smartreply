const { OpenAI } = require('openai');
const env = require('./env');

let openaiClient = null;

if (env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

module.exports = openaiClient;
