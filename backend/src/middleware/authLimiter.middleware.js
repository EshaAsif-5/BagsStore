import rateLimit from "express-rate-limit";
import { settings } from "../config/settings.js";

// ─────────────────────────────────────────────
// AUTH RATE LIMITER
// Separated from app.js so route modules can import
// it without creating a circular dependency with app.js.
// ─────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: settings.rateLimit.windowMs,
  max: settings.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});
