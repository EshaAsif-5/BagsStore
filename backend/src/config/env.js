// config/env.js
// Centralized environment variable loading and validation.
// Importing this file (early, before anything else) ensures process.env
// is populated from .env and that required variables are present
// before the rest of the app tries to use them.

const dotenv = require('dotenv');

// Load variables from .env into process.env
dotenv.config();

// List of environment variables that MUST be defined for the app to run safely.
// If any of these are missing, we fail fast with a clear error instead of
// letting the app start in a broken/insecure state.
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRES_IN',
  'CLIENT_URL',
];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    // Fail fast: don't let the server start with missing critical config.
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Check your .env file against .env.example.'
    );
  }
}

validateEnv();

// Export a single, structured config object so the rest of the app
// imports configuration values from one place rather than reading
// process.env directly everywhere (easier to manage, test, and refactor).
const env = {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT || 5000,
  isProduction: process.env.NODE_ENV === 'production',

  mongoUri: process.env.MONGODB_URI,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  clientUrl: process.env.CLIENT_URL,

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL,
  },

  whatsappBusinessNumber: process.env.WHATSAPP_BUSINESS_NUMBER,

  bank: {
    accountTitle: process.env.BANK_ACCOUNT_TITLE,
    accountNumber: process.env.BANK_ACCOUNT_NUMBER,
    bankName: process.env.BANK_NAME,
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // default: 15 minutes
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // default: 100 requests per window
  },
};

module.exports = env;