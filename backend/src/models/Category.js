// models/Category.js
// Represents product categories (e.g., "University Bags", "Modern Bags").
// Kept as a separate collection so categories can be managed (added,
// renamed, disabled, reordered) by admins without code changes.

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      // URL-friendly: lowercase letters, numbers, and hyphens only
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must be lowercase letters, numbers, and hyphens only',
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    image: {
      type: String, // URL to category image (e.g., Cloudinary)
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      // Determines display order in navigation/category listings
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ---------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------
// Unique index on slug for fast lookups when filtering products by category
// via URL (e.g., /shop/university-bags).
categorySchema.index({ slug: 1 }, { unique: true });

// Index on isActive + sortOrder for efficiently fetching the ordered list
// of visible categories (e.g., for navbar/menu rendering).
categorySchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);