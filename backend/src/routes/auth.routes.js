import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { authLimiter } from "../middleware/authLimiter.middleware.js";
import {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateAddress,
  validateObjectIdParam,
} from "../validators/auth.validators.js";

const router = Router();

// ─────────────────────────────────────────────
// PUBLIC ROUTES (no authentication required)
// ─────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Rate limited — prevents bulk account creation
 */
router.post(
  "/register",
  authLimiter,
  validateRegister,
  validate,
  authController.register
);

/**
 * POST /api/v1/auth/login
 * Rate limited — brute force protection
 */
router.post(
  "/login",
  authLimiter,
  validateLogin,
  validate,
  authController.login
);

/**
 * POST /api/v1/auth/refresh-token
 * Issues new access + refresh token pair from a valid refresh token cookie.
 * Has its own rate limit via the cookie path restriction set on the cookie itself.
 */
router.post("/refresh-token", authController.refreshToken);

// ─────────────────────────────────────────────
// PROTECTED ROUTES (authentication required)
// ─────────────────────────────────────────────

/**
 * POST /api/v1/auth/logout
 */
router.post("/logout", verifyToken, authController.logout);

/**
 * GET  /api/v1/auth/me  — get profile
 * PUT  /api/v1/auth/me  — update name/phone
 */
router
  .route("/me")
  .get(verifyToken, authController.getMe)
  .put(verifyToken, validateUpdateProfile, validate, authController.updateProfile);

/**
 * PUT /api/v1/auth/me/password
 */
router.put(
  "/me/password",
  verifyToken,
  validateChangePassword,
  validate,
  authController.changePassword
);

// ─────────────────────────────────────────────
// ADDRESS ROUTES
// ─────────────────────────────────────────────

/**
 * POST /api/v1/auth/me/addresses  — add new address
 */
router.post(
  "/me/addresses",
  verifyToken,
  validateAddress,
  validate,
  authController.addAddress
);

/**
 * PUT    /api/v1/auth/me/addresses/:addressId  — update address
 * DELETE /api/v1/auth/me/addresses/:addressId  — remove address
 */
router
  .route("/me/addresses/:addressId")
  .put(
    verifyToken,
    validateObjectIdParam("addressId"),
    validateAddress,
    validate,
    authController.updateAddress
  )
  .delete(
    verifyToken,
    validateObjectIdParam("addressId"),
    validate,
    authController.deleteAddress
  );

export default router;