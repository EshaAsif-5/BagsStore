import Review from "../models/Review.model.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// REVIEW REPOSITORY
// Pure database access layer — no business logic.
// ─────────────────────────────────────────────

/**
 * Create and persist a new review.
 */
const createReview = async (reviewData) => {
  const review = new Review(reviewData);
  await review.save();
  return review;
};

/**
 * Find a review by its MongoDB ObjectId.
 */
const findById = (reviewId) => {
  return Review.findById(reviewId)
    .populate("user", "name")
    .populate("product", "name slug");
};

/**
 * Find a review by ID without population — for internal mutations.
 */
const findByIdRaw = (reviewId) => {
  return Review.findById(reviewId);
};

/**
 * Get all approved reviews for a product.
 * Paginated, sorted newest first.
 */
const findApprovedByProduct = async (productId, { page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    product: new mongoose.Types.ObjectId(productId),
    isApproved: true,
  };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("user", "name")
      .select("rating title body user createdAt"),
    Review.countDocuments(filter),
  ]);

  return {
    reviews,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    hasNextPage: pageNum < Math.ceil(total / limitNum),
    hasPrevPage: pageNum > 1,
  };
};

/**
 * Get rating distribution for a product (1–5 star counts).
 * Used to render the rating breakdown bar chart on the product page.
 */
const getRatingDistribution = async (productId) => {
  const distribution = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  // Normalize to always return all 5 ratings even if count is 0
  const result = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  distribution.forEach(({ _id, count }) => {
    result[_id] = count;
  });

  return result;
};

/**
 * Check if a user has already reviewed a specific product
 * under a specific order (unique compound index).
 */
const findExistingReview = (userId, productId, orderId) => {
  return Review.findOne({
    user: new mongoose.Types.ObjectId(userId),
    product: new mongoose.Types.ObjectId(productId),
    order: new mongoose.Types.ObjectId(orderId),
  });
};

/**
 * Admin: get all reviews with optional filters.
 * Includes both approved and pending reviews.
 */
const findAllAdmin = async ({
  page = 1,
  limit = 20,
  isApproved,
  productId,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (isApproved !== undefined && isApproved !== null) {
    filter.isApproved = isApproved === "true" || isApproved === true;
  }
  if (productId) {
    filter.product = new mongoose.Types.ObjectId(productId);
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("user", "name email")
      .populate("product", "name slug category")
      .populate("order", "orderNumber"),
    Review.countDocuments(filter),
  ]);

  return {
    reviews,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * Approve a review — sets isApproved: true and records who approved it.
 */
const approveReview = (reviewId, adminId) => {
  return Review.findByIdAndUpdate(
    reviewId,
    {
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: adminId,
    },
    { new: true }
  ).populate("product", "name slug");
};

/**
 * Reject/un-approve a review.
 */
const rejectReview = (reviewId) => {
  return Review.findByIdAndUpdate(
    reviewId,
    {
      isApproved: false,
      approvedAt: null,
      approvedBy: null,
    },
    { new: true }
  );
};

/**
 * Hard-delete a review (admin only).
 * Post-delete hook on the model recalculates product rating.
 */
const deleteReview = (reviewId) => {
  return Review.findByIdAndDelete(reviewId);
};

/**
 * Get pending review count — for admin badge/notification.
 */
const countPending = () => {
  return Review.countDocuments({ isApproved: false });
};

/**
 * Save a mutated review document.
 */
const saveReview = (review) => {
  return review.save();
};

export const reviewRepository = {
  createReview,
  findById,
  findByIdRaw,
  findApprovedByProduct,
  getRatingDistribution,
  findExistingReview,
  findAllAdmin,
  approveReview,
  rejectReview,
  deleteReview,
  countPending,
  saveReview,
};