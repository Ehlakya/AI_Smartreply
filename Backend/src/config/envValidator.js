const env = require('./env');

const validateEnv = () => {
  const required = [
    'PORT',
    'DB_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'FRONTEND_URL',
    'GROQ_API_KEY'
  ];

  const missing = [];

  for (const key of required) {
    const value = env[key];
    
    // Strict type checking, never call .includes() on non-strings
    if (
      value === undefined || 
      value === null || 
      value === '' || 
      (typeof value === 'string' && value.includes('your_'))
    ) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('\n⚠ CRITICAL ENVIRONMENT CONFIGURATION ERROR ⚠');
    missing.forEach(key => {
      console.error(`- Missing or invalid: ${key}`);
    });
    console.error('Please configure your .env file properly.\n');
    throw new Error('Environment validation failed due to missing variables.');
  }

  // STEP 2: Print masked variables in development mode
  if (env.NODE_ENV === 'development') {
    console.log('\n--- Environment Variables Loaded ---');
    const mask = (str) => {
      if (!str || str.includes('paste-') || str.includes('your_')) return '[INVALID OR MISSING]';
      if (str.length <= 8) return '********';
      return str.substring(0, 4) + '*'.repeat(str.length - 8) + str.substring(str.length - 4);
    };

    console.log(`GOOGLE_CLIENT_ID:     ${mask(env.GOOGLE_CLIENT_ID)}`);
    console.log(`GOOGLE_CLIENT_SECRET: ${mask(env.GOOGLE_CLIENT_SECRET)}`);
    console.log(`GOOGLE_REDIRECT_URI:  ${env.GOOGLE_REDIRECT_URI}`);
    console.log(`FRONTEND_URL:         ${env.FRONTEND_URL}`);
    console.log(`GROQ_API_KEY:         ${mask(env.GROQ_API_KEY)}`);
    console.log(`GROQ_MODEL:           ${env.GROQ_MODEL}`);
    console.log('------------------------------------\n');
  }

  // Strict Placeholder Checks
  const placeholders = [
    '<paste-your-client-id-here>',
    '<paste-your-client-secret-here>',
    '<paste-your-groq-api-key-here>',
    'username:password'
  ];

  let hasPlaceholders = false;
  
  if (env.GOOGLE_CLIENT_ID && placeholders.includes(env.GOOGLE_CLIENT_ID)) {
    console.warn('⚠ WARNING: GOOGLE_CLIENT_ID is missing or is still a placeholder.');
    hasPlaceholders = true;
  }
  
  if (env.GOOGLE_CLIENT_SECRET && placeholders.includes(env.GOOGLE_CLIENT_SECRET)) {
    console.warn('⚠ WARNING: GOOGLE_CLIENT_SECRET is missing or is still a placeholder.');
    hasPlaceholders = true;
  }
  
  if (env.GROQ_API_KEY && placeholders.includes(env.GROQ_API_KEY)) {
    console.warn('⚠ WARNING: GROQ_API_KEY is still a placeholder. AI features will be disabled.');
  }

  if (env.DB_URL && env.DB_URL.includes('username:password')) {
    console.warn('⚠ WARNING: DB_URL contains default username:password.');
    hasPlaceholders = true;
  }

  if (hasPlaceholders) {
    console.error('\n⚠ CRITICAL ENVIRONMENT CONFIGURATION ERROR ⚠');
    console.error('The server cannot boot with placeholder credentials.');
    throw new Error('Environment validation failed due to placeholder credentials.');
  }

  return true;
};

module.exports = validateEnv;
