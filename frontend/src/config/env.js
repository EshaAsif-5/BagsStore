// ─────────────────────────────────────────────
// CENTRALISED FRONTEND ENVIRONMENT CONFIG
// All Vite env variables are read here once.
// ─────────────────────────────────────────────

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  clientUrl: import.meta.env.VITE_CLIENT_URL ?? "",
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER ?? "",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL ?? "",
  cloudinaryCloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? "",

  bankName: import.meta.env.VITE_BANK_NAME ?? "",
  bankAccountTitle: import.meta.env.VITE_BANK_ACCOUNT_TITLE ?? "",
  bankAccountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER ?? "",
  easypaisaNumber: import.meta.env.VITE_EASYPAISA_NUMBER ?? "",
  jazzcashNumber: import.meta.env.VITE_JAZZCASH_NUMBER ?? "",

  shippingFeeStandard: toNumber(import.meta.env.VITE_SHIPPING_FEE_STANDARD, 200),
  shippingFreeThreshold: toNumber(import.meta.env.VITE_SHIPPING_FREE_THRESHOLD, 5000),
};
