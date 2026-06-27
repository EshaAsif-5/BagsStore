import mongoose from "mongoose";

// ─────────────────────────────────────────────
// REVIEW SCHEMA
// ─────────────────────────────────────────────
const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order reference is required for verified purchase"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number between 1 and 5",
      },
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, "Review title cannot exceed 100 characters"],
      default: "",
    },
    body: {
      type: String,
      required: [true, "Review text is required"],
      trim: true,
      minlength: [10, "Review must be at least 10 characters"],
      maxlength: [1000, "Review cannot exceed 1000 characters"],
    },
    isApproved: {
      type: Boolean,
      default: false, // Admin must approve before it's publicly visible
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────
reviewSchema.index({ product: 1, isApproved: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ createdAt: -1 });

// Prevent a user from reviewing the same product twice (per order)
reviewSchema.index({ product: 1, user: 1, order: 1 }, { unique: true });

// ─────────────────────────────────────────────
// STATIC METHOD: RECALCULATE PRODUCT RATING
// Called after save/delete to keep Product.averageRating in sync
// ─────────────────────────────────────────────
reviewSchema.statics.recalculateProductRating = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const averageRating = stats.length > 0 ? stats[0].averageRating : 0;
  const reviewCount = stats.length > 0 ? stats[0].reviewCount : 0;

  await mongoose.model("Product").findByIdAndUpdate(productId, {
    averageRating: Math.round(averageRating * 10) / 10,
    reviewCount,
  });
};

// ─────────────────────────────────────────────
// POST-SAVE: UPDATE PRODUCT RATING WHEN APPROVED
// ─────────────────────────────────────────────
reviewSchema.post("save", async function () {
  await this.constructor.recalculateProductRating(this.product);
});

// ─────────────────────────────────────────────
// POST-DELETE: UPDATE PRODUCT RATING
// ─────────────────────────────────────────────
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await mongoose.model("Review").recalculateProductRating(doc.product);
  }
});

// ─────────────────────────────────────────────
// PRE-SAVE: SET APPROVED TIMESTAMP
// ─────────────────────────────────────────────
reviewSchema.pre("save", function () {
  if (this.isModified("isApproved") && this.isApproved && !this.approvedAt) {
    this.approvedAt = new Date();
  }
});

// ─────────────────────────────────────────────
// TRANSFORM
// ─────────────────────────────────────────────
reviewSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;