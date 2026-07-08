require('dotenv').config();

const cleanEnv = (value, defaultValue) => {
  if (value && typeof value === 'string') {
    const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
    return cleaned !== '' ? cleaned : defaultValue;
  }
  return defaultValue;
};

module.exports = {
  NODE_ENV: cleanEnv(process.env.NODE_ENV, 'development'),
  PORT: cleanEnv(process.env.PORT, '5000'),
  DB_URL: cleanEnv(process.env.DB_URL, 'postgresql://localhost:5432/ai_mail_assistant'),
  JWT_SECRET: cleanEnv(process.env.JWT_SECRET, 'fallback_secret'),
  JWT_REFRESH_SECRET: cleanEnv(process.env.JWT_REFRESH_SECRET, 'fallback_refresh_secret'),
  JWT_EXPIRES_IN: cleanEnv(process.env.JWT_EXPIRES_IN, '1d'),
  JWT_REFRESH_EXPIRES_IN: cleanEnv(process.env.JWT_REFRESH_EXPIRES_IN, '7d'),
  GOOGLE_CLIENT_ID: cleanEnv(process.env.GOOGLE_CLIENT_ID, undefined),
  GOOGLE_CLIENT_SECRET: cleanEnv(process.env.GOOGLE_CLIENT_SECRET, undefined),
  GOOGLE_REDIRECT_URI: cleanEnv(process.env.GOOGLE_REDIRECT_URI, undefined),
  GROQ_API_KEY: cleanEnv(process.env.GROQ_API_KEY, undefined),
  GROQ_MODEL: cleanEnv(process.env.GROQ_MODEL, 'llama-3.3-70b-versatile'),
  FRONTEND_URL: cleanEnv(process.env.FRONTEND_URL, 'http://localhost:3000'),
};
