import { reviewService } from "../services/review.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─────────────────────────────────────────────
// REVIEW CONTROLLERS
// ─────────────────────────────────────────────

// ── PUBLIC ───────────────────────────────────

/**
 * GET /api/v1/reviews/products/:productId
 * Get all approved reviews for a product.
 * Includes rating distribution (1–5 star counts) and product summary.
 *
 * Query params: page, limit
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getProductReviews(
    req.params.productId,
    req.query
  );

  return res.status(200).json(
    new ApiResponse(200, result, "Product reviews fetched successfully.")
  );
});

// ── AUTHENTICATED CUSTOMER ───────────────────

/**
 * POST /api/v1/reviews/products/:productId
 * Submit a review for a product the customer has received.
 *
 * Requirements enforced in service:
 *   - User must be authenticated
 *   - User must have a DELIVERED order containing this product
 *   - One review per product per order (enforced at DB index level too)
 *
 * Body: { rating, title?, body }
 */
const submitReview = asyncHandler(async (req, res) => {
  const { rating, title, body } = req.body;

  const result = await reviewService.submitReview(
    req.user._id,
    req.params.productId,
    { rating, title, body }
  );

  return res.status(201).json(
    new ApiResponse(201, { review: result.review }, result.message)
  );
});

// ── ADMIN ────────────────────────────────────

/**
 * GET /api/v1/reviews/admin/all
 * Admin: get all reviews including pending (unapproved) ones.
 *
 * Query params: page, limit, isApproved, productId
 */
const getAllReviewsAdmin = asyncHandler(async (req, res) => {
  const result = await reviewService.getAllReviewsAdmin(req.query);

  return res.status(200).json(
    new ApiResponse(200, result, "Reviews fetched successfully.")
  );
});

/**
 * GET /api/v1/reviews/admin/pending-count
 * Admin: get count of unapproved reviews for sidebar notification badge.
 */
const getPendingCount = asyncHandler(async (req, res) => {
  const result = await reviewService.getPendingCount();

  return res.status(200).json(
    new ApiResponse(200, result, "Pending review count fetched.")
  );
});

/**
 * PUT /api/v1/reviews/admin/:reviewId/approve
 * Admin: approve a pending review — makes it publicly visible.
 * Triggers product averageRating recalculation via model post-save hook.
 */
const approveReview = asyncHandler(async (req, res) => {
  const review = await reviewService.approveReview(
    req.params.reviewId,
    req.user._id
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { review },
      "Review approved and is now publicly visible."
    )
  );
});

/**
 * PUT /api/v1/reviews/admin/:reviewId/reject
 * Admin: reject (un-approve) a review — hides it from public view.
 * Triggers product averageRating recalculation to exclude this review.
 */
const rejectReview = asyncHandler(async (req, res) => {
  const review = await reviewService.rejectReview(req.params.reviewId);

  return res.status(200).json(
    new ApiResponse(
      200,
      { review },
      "Review rejected and removed from public view."
    )
  );
});

/**
 * DELETE /api/v1/reviews/admin/:reviewId
 * Admin: permanently delete a review.
 * Triggers product averageRating recalculation via model post-delete hook.
 */
const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.params.reviewId);

  return res.status(200).json(
    new ApiResponse(200, null, "Review deleted successfully.")
  );
});

export const reviewController = {
  getProductReviews,
  submitReview,
  getAllReviewsAdmin,
  getPendingCount,
  approveReview,
  rejectReview,
  deleteReview,
};