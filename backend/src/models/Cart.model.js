import mongoose from "mongoose";

// ─────────────────────────────────────────────
// CART ITEM SUB-SCHEMA
// ─────────────────────────────────────────────
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Variant ID is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      max: [50, "Quantity cannot exceed 50 per item"],
      default: 1,
    },
    // Snapshot: price locked at time of adding to cart
    // (Used for display; always re-validated server-side at checkout)
    priceAtAdd: {
      type: Number,
      required: [true, "Price at time of adding is required"],
      min: [0, "Price cannot be negative"],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ─────────────────────────────────────────────
// CART SCHEMA
// ─────────────────────────────────────────────
const cartSchema = new mongoose.Schema(
  {
    // Omitted entirely on guest carts (identified by sessionId instead).
    // Do NOT default to null — a unique sparse index on user treats null as a
    // duplicate value and only allows one guest cart in the whole database.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Guest cart identifier (UUID generated client-side, stored in cookie)
    sessionId: {
      type: String,
      default: null,
      trim: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 30,
        message: "Cart cannot contain more than 30 different items",
      },
    },
    // TTL field — guest carts expire after 7 days of inactivity
    expiresAt: {
      type: Date,
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
// One cart per authenticated user — partial index excludes guest carts (no user field).
cartSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: "objectId" } },
  }
);
// One cart per guest session
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL for guest carts

// ─────────────────────────────────────────────
// PRE-SAVE: SET EXPIRY FOR GUEST CARTS
// Authenticated user carts do not expire.
// ─────────────────────────────────────────────
cartSchema.pre("save", function () {
  if (!this.user && this.sessionId) {
    // Guest cart: expires 7 days from last update
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    this.expiresAt = new Date(Date.now() + sevenDays);
  } else {
    // Authenticated user cart: never expires via TTL
    this.expiresAt = null;
  }
});

// ─────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────
cartSchema.virtual("itemCount").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

cartSchema.virtual("estimatedTotal").get(function () {
  return this.items.reduce(
    (sum, item) => sum + item.priceAtAdd * item.quantity,
    0
  );
});

// ─────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────

// Add or increment an item in the cart
cartSchema.methods.addItem = function (productId, variantId, quantity, price) {
  const existingIndex = this.items.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      item.variantId.toString() === variantId.toString()
  );

  if (existingIndex > -1) {
    // Update quantity if item already in cart
    this.items[existingIndex].quantity = Math.min(
      this.items[existingIndex].quantity + quantity,
      50
    );
  } else {
    this.items.push({ product: productId, variantId, quantity, priceAtAdd: price });
  }
};

// Remove an item from cart by its _id
cartSchema.methods.removeItem = function (itemId) {
  this.items = this.items.filter(
    (item) => item._id.toString() !== itemId.toString()
  );
};

// Update quantity of a specific cart item
cartSchema.methods.updateItemQuantity = function (itemId, quantity) {
  const item = this.items.find(
    (item) => item._id.toString() === itemId.toString()
  );
  if (item) {
    item.quantity = Math.max(1, Math.min(quantity, 50));
  }
};

// Merge guest cart items into authenticated user's cart
cartSchema.methods.mergeWith = function (guestItems) {
  guestItems.forEach(({ product, variantId, quantity, priceAtAdd }) => {
    this.addItem(product, variantId, quantity, priceAtAdd);
  });
};

// ─────────────────────────────────────────────
// TRANSFORM
// ─────────────────────────────────────────────
cartSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;