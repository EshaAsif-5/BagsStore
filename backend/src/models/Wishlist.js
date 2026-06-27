// models/Wishlist.js
// While a lightweight wishlist array is embedded directly on the User
// model (for simple add/remove operations), this standalone Wishlist
// model is provided for cases where wishlist data needs to be queried,
// paginated, or analyzed independently of the user document — e.g.,
// "most wishlisted products" analytics, or if wishlists grow large
// enough that embedding becomes impractical.
//
// One document per user, with an array of wishlist entries (each
// referencing a product and recording when it was added).

const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Wishlist item must reference a product'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Wishlist must belong to a user'],
      unique: true, // one wishlist document per user
    },
    items: [wishlistItemSchema],
  },
  {
    timestamps: true,
  }
);

// ---------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------

// Unique index ensures a user has exactly one wishlist document.
wishlistSchema.index({ user: 1 }, { unique: true });

// Index on items.product for "most wishlisted products" style queries.
wishlistSchema.index({ 'items.product': 1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);