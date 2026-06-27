import api from "./api.js";

// ─────────────────────────────────────────────
// REVIEW SERVICE
// Public: read approved reviews.
// Customer: submit review (verified purchase only).
// Admin: moderate (approve/reject/delete) reviews.
// ─────────────────────────────────────────────

/**
 * Get approved reviews and rating distribution for a product.
 * Public — no authentication required.
 *
 * @param {string} productId
 * @param {{ page?, limit? }} params
 * @returns {{ reviews, total, page, totalPages, product, ratingDistribution }}
 */
const getProductReviews = async (productId, params = {}) => {
  const { data } = await api.get(`/reviews/products/${productId}`, { params });
  return data.data;
};

/**
 * Submit a review for a purchased product.
 * Requires authentication + delivered order containing this product.
 *
 * @param {string} productId
 * @param {{ rating, title?, body }} payload
 */
const submitReview = async (productId, { rating, title, body }) => {
  const { data } = await api.post(`/reviews/products/${productId}`, {
    rating,
    title,
    body,
  });
  return data.data.review;
};

// ── Admin ─────────────────────────────────────

/**
 * Admin: get all reviews — approved, pending, or all.
 * @param {{ page?, limit?, isApproved?, productId? }} params
 */
const getAllReviewsAdmin = async (params = {}) => {
  const { data } = await api.get("/reviews/admin/all", { params });
  return data.data;
};

/**
 * Admin: get count of unapproved reviews for badge display.
 */
const getPendingCount = async () => {
  const { data } = await api.get("/reviews/admin/pending-count");
  return data.data.pendingCount;
};

/**
 * Admin: approve a pending review.
 * Makes it publicly visible and recalculates product rating.
 * @param {string} reviewId
 */
const approveReview = async (reviewId) => {
  const { data } = await api.put(`/reviews/admin/${reviewId}/approve`);
  return data.data.review;
};

/**
 * Admin: reject (un-approve) a review.
 * Hides it from public view and recalculates product rating.
 * @param {string} reviewId
 */
const rejectReview = async (reviewId) => {
  const { data } = await api.put(`/reviews/admin/${reviewId}/reject`);
  return data.data.review;
};

/**
 * Admin: permanently delete a review.
 * Triggers product rating recalculation via server model hook.
 * @param {string} reviewId
 */
const deleteReview = async (reviewId) => {
  const { data } = await api.delete(`/reviews/admin/${reviewId}`);
  return data;
};

const reviewService = {
  getProductReviews,
  submitReview,
  getAllReviewsAdmin,
  getPendingCount,
  approveReview,
  rejectReview,
  deleteReview,
};

export default reviewService;