// ─────────────────────────────────────────────
// CENTRALISED BACKEND SETTINGS
// All environment-backed configuration lives here.
// ─────────────────────────────────────────────

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const settings = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 5000),
  isProduction: process.env.NODE_ENV === "production",

  mongoUri: process.env.MONGO_URI,

  clientUrl: process.env.CLIENT_URL,
  devClientUrl: process.env.DEV_CLIENT_URL,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    admin: process.env.ADMIN_EMAIL,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  whatsappNumber: process.env.WHATSAPP_NUMBER,

  bank: {
    name: process.env.BANK_NAME,
    accountTitle: process.env.BANK_ACCOUNT_TITLE,
    accountNumber: process.env.BANK_ACCOUNT_NUMBER,
    iban: process.env.BANK_IBAN,
  },

  easypaisaNumber: process.env.EASYPAISA_NUMBER,
  jazzcashNumber: process.env.JAZZCASH_NUMBER,

  shipping: {
    feeStandard: toNumber(process.env.SHIPPING_FEE_STANDARD, 200),
    freeThreshold: toNumber(process.env.SHIPPING_FREE_THRESHOLD, 5000),
  },

  rateLimit: {
    windowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    authMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10),
  },
};

export const allowedOrigins = [
  settings.clientUrl,
  settings.devClientUrl,
].filter(Boolean);
