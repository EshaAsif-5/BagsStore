import { reviewRepository } from "../repositories/review.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────────
// REVIEW SERVICE
// Business logic for review submission, moderation,
// and rating aggregation.
// ─────────────────────────────────────────────

/**
 * Get approved reviews for a product with rating distribution.
 * Public endpoint — no auth required.
 */
const getProductReviews = async (productId, queryParams) => {
  const product = await productRepository.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const [reviewData, ratingDistribution] = await Promise.all([
    reviewRepository.findApprovedByProduct(productId, queryParams),
    reviewRepository.getRatingDistribution(productId),
  ]);

  return {
    ...reviewData,
    product: {
      _id: product._id,
      name: product.name,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
    },
    ratingDistribution,
  };
};

/**
 * Submit a new product review.
 *
 * Rules enforced:
 *  1. User must be authenticated
 *  2. User must have a DELIVERED order containing the product (verified purchase)
 *  3. User can only review a product once per order
 */
const submitReview = async (userId, productId, { rating, title, body }) => {
  // 1. Confirm product exists
  const product = await productRepository.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found or no longer available.");
  }

  // 2. Verified purchase check — must have a delivered order with this product
  const deliveredOrder = await orderRepository.findDeliveredOrderWithProduct(
    userId,
    productId
  );

  if (!deliveredOrder) {
    throw new ApiError(
      403,
      "You can only review products from delivered orders. " +
      "Once your order is delivered, you'll be able to share your experience."
    );
  }

  // 3. Duplicate review check — one review per product per order
  const existing = await reviewRepository.findExistingReview(
    userId,
    productId,
    deliveredOrder._id
  );

  if (existing) {
    throw new ApiError(
      409,
      "You have already submitted a review for this product from this order."
    );
  }

  // 4. Create the review (isApproved: false by default — admin must approve)
  const review = await reviewRepository.createReview({
    product: productId,
    user: userId,
    order: deliveredOrder._id,
    rating,
    title: title?.trim() || "",
    body: body.trim(),
    isApproved: false,
  });

  // Note: Product averageRating is recalculated by the Review model's
  // post-save hook, but only counts approved reviews. This new review
  // won't affect the rating until an admin approves it.

  return {
    review: {
      _id: review._id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      isApproved: review.isApproved,
      createdAt: review.createdAt,
    },
    message:
      "Your review has been submitted and is pending approval. " +
      "It will be visible once our team reviews it.",
  };
};

/**
 * Admin: get all reviews with optional filters.
 */
const getAllReviewsAdmin = async (queryParams) => {
  return reviewRepository.findAllAdmin(queryParams);
};

/**
 * Admin: approve a review — makes it publicly visible.
 * Triggers the product rating recalculation via the Review model hook
 * (indirectly, since we use findByIdAndUpdate which bypasses save hooks,
 * so we manually trigger recalculation here).
 */
const approveReview = async (reviewId, adminId) => {
  const review = await reviewRepository.findByIdRaw(reviewId);
  if (!review) {
    throw new ApiError(404, "Review not found.");
  }

  if (review.isApproved) {
    throw new ApiError(400, "This review is already approved.");
  }

  // Use save() path so the post-save hook recalculates product rating
  review.isApproved = true;
  review.approvedAt = new Date();
  review.approvedBy = adminId;
  await reviewRepository.saveReview(review);

  const populated = await reviewRepository.findById(reviewId);
  return populated;
};

/**
 * Admin: reject (un-approve) a review — hides it from public view.
 * Recalculates product rating to exclude this review.
 */
const rejectReview = async (reviewId) => {
  const review = await reviewRepository.findByIdRaw(reviewId);
  if (!review) {
    throw new ApiError(404, "Review not found.");
  }

  if (!review.isApproved) {
    throw new ApiError(400, "This review is already pending / rejected.");
  }

  review.isApproved = false;
  review.approvedAt = null;
  review.approvedBy = null;
  await reviewRepository.saveReview(review);

  // Manually trigger rating recalculation since we're using save()
  // (post-save hook fires on any save, recalculates correctly)

  return review;
};

/**
 * Admin: delete a review entirely.
 * Post-delete hook recalculates product rating.
 */
const deleteReview = async (reviewId) => {
  const review = await reviewRepository.findByIdRaw(reviewId);
  if (!review) {
    throw new ApiError(404, "Review not found.");
  }

  // findByIdAndDelete triggers the post-findOneAndDelete hook on the model
  await reviewRepository.deleteReview(reviewId);
};

/**
 * Get pending review count for admin badge.
 */
const getPendingCount = async () => {
  const count = await reviewRepository.countPending();
  return { pendingCount: count };
};

export const reviewService = {
  getProductReviews,
  submitReview,
  getAllReviewsAdmin,
  approveReview,
  rejectReview,
  deleteReview,
  getPendingCount,
};