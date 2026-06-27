import { Router } from "express";
import { body, param, query } from "express-validator";
import rateLimit from "express-rate-limit";
import { reviewController } from "../controllers/review.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

// ─────────────────────────────────────────────
// RATE LIMITER — review submission
// One review per 10 minutes per IP to prevent spam.
// The DB unique index is the real enforcement layer;
// this just slows down malicious attempts.
// ─────────────────────────────────────────────
const reviewSubmitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many review submissions. Please wait before trying again.",
  },
});

// ─────────────────────────────────────────────
// INLINE VALIDATORS
// ─────────────────────────────────────────────
const validateProductIdParam = [
  param("productId")
    .isMongoId()
    .withMessage("Invalid productId. Must be a valid ID."),
];

const validateReviewIdParam = [
  param("reviewId")
    .isMongoId()
    .withMessage("Invalid reviewId. Must be a valid ID."),
];

const validateProductQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50.")
    .toInt(),
];

const validateSubmitReview = [
  body("rating")
    .notEmpty()
    .withMessage("Rating is required.")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be a whole number between 1 and 5.")
    .toInt(),

  body("title")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Review title cannot exceed 100 characters."),

  body("body")
    .trim()
    .notEmpty()
    .withMessage("Review text is required.")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Review must be between 10 and 1000 characters."),
];

const validateAdminReviewQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100.")
    .toInt(),
  query("isApproved")
    .optional()
    .isBoolean()
    .withMessage("isApproved must be true or false."),
  query("productId")
    .optional()
    .isMongoId()
    .withMessage("productId must be a valid ID."),
];

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

/**
 * GET /api/v1/reviews/products/:productId
 * Get approved reviews + rating distribution for a product.
 * Query params: page, limit
 */
router.get(
  "/products/:productId",
  validateProductIdParam,
  validateProductQuery,
  validate,
  reviewController.getProductReviews
);

// ─────────────────────────────────────────────
// ADMIN ROUTES
// Must be defined before /:reviewId to avoid
// "admin" matching as a Mongo ObjectId param.
// ─────────────────────────────────────────────

/**
 * GET /api/v1/reviews/admin/all
 * Admin: all reviews with optional filters.
 * Query params: page, limit, isApproved, productId
 */
router.get(
  "/admin/all",
  verifyToken,
  requireAdmin,
  validateAdminReviewQuery,
  validate,
  reviewController.getAllReviewsAdmin
);

/**
 * GET /api/v1/reviews/admin/pending-count
 * Admin: count of unapproved reviews for sidebar badge.
 */
router.get(
  "/admin/pending-count",
  verifyToken,
  requireAdmin,
  reviewController.getPendingCount
);

/**
 * PUT /api/v1/reviews/admin/:reviewId/approve
 * Admin: approve a pending review.
 * Triggers product averageRating recalculation.
 */
router.put(
  "/admin/:reviewId/approve",
  verifyToken,
  requireAdmin,
  validateReviewIdParam,
  validate,
  reviewController.approveReview
);

/**
 * PUT /api/v1/reviews/admin/:reviewId/reject
 * Admin: un-approve / hide a review from public view.
 * Triggers product averageRating recalculation.
 */
router.put(
  "/admin/:reviewId/reject",
  verifyToken,
  requireAdmin,
  validateReviewIdParam,
  validate,
  reviewController.rejectReview
);

/**
 * DELETE /api/v1/reviews/admin/:reviewId
 * Admin: permanently delete a review.
 * Triggers product averageRating recalculation via model hook.
 */
router.delete(
  "/admin/:reviewId",
  verifyToken,
  requireAdmin,
  validateReviewIdParam,
  validate,
  reviewController.deleteReview
);

// ─────────────────────────────────────────────
// AUTHENTICATED CUSTOMER ROUTES
// ─────────────────────────────────────────────

/**
 * POST /api/v1/reviews/products/:productId
 * Submit a product review.
 * Requires: authenticated + verified purchase (delivered order).
 * Body: { rating, title?, body }
 */
router.post(
  "/products/:productId",
  reviewSubmitLimiter,
  verifyToken,
  validateProductIdParam,
  validateSubmitReview,
  validate,
  reviewController.submitReview
);

export default router;