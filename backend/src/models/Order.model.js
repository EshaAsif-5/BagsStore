import mongoose from "mongoose";

// ─────────────────────────────────────────────
// ORDER ITEM SUB-SCHEMA (snapshot at time of purchase)
// ─────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },
    // Snapshots — prices/names are preserved even if product changes later
    name: {
      type: String,
      required: [true, "Product name snapshot is required"],
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    variant: {
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Variant ID is required"],
      },
      color: {
        type: String,
        required: [true, "Variant color snapshot is required"],
        trim: true,
      },
      size: {
        type: String,
        required: [true, "Variant size snapshot is required"],
        trim: true,
      },
      price: {
        type: Number,
        required: [true, "Variant price snapshot is required"],
        min: [0, "Price cannot be negative"],
      },
      sku: {
        type: String,
        trim: true,
      },
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
  },
  { _id: true }
);

// ─────────────────────────────────────────────
// SHIPPING ADDRESS SUB-SCHEMA
// ─────────────────────────────────────────────
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [80, "Full name cannot exceed 80 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^(\+92|0)[0-9]{10}$/, "Please provide a valid Pakistani phone number"],
    },
    street: {
      type: String,
      required: [true, "Street address is required"],
      trim: true,
      maxlength: [200, "Street address cannot exceed 200 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [60, "City name cannot exceed 60 characters"],
    },
    province: {
      type: String,
      required: [true, "Province is required"],
      enum: {
        values: [
          "Punjab",
          "Sindh",
          "Khyber Pakhtunkhwa",
          "Balochistan",
          "Gilgit-Baltistan",
          "Azad Kashmir",
          "Islamabad Capital Territory",
        ],
        message: "{VALUE} is not a valid Pakistani province or territory",
      },
    },
    postalCode: {
      type: String,
      trim: true,
      match: [/^[0-9]{5}$/, "Postal code must be 5 digits"],
    },
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// PAYMENT SUB-SCHEMA
// ─────────────────────────────────────────────
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      required: [true, "Payment method is required"],
      enum: {
        values: ["cod", "bank_transfer", "easypaisa", "jazzcash", "card"],
        message: "{VALUE} is not a valid payment method",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "paid", "failed", "refunded"],
        message: "{VALUE} is not a valid payment status",
      },
      default: "pending",
    },
    transactionId: {
      type: String,
      trim: true,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    // Bank transfer / EasyPaisa / JazzCash proof
    paymentProof: {
      type: String, // Cloudinary URL
      default: null,
    },
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// STATUS HISTORY SUB-SCHEMA (audit trail)
// ─────────────────────────────────────────────
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, "Status note cannot exceed 300 characters"],
      default: "",
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ─────────────────────────────────────────────
// ORDER SCHEMA
// ─────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      // Generated in pre-save hook
    },
    // Registered user (null for guest orders)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Guest checkout info (used when user is null)
    guestInfo: {
      name: {
        type: String,
        trim: true,
        maxlength: [80, "Name cannot exceed 80 characters"],
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
          "Please provide a valid email address",
        ],
      },
      phone: {
        type: String,
        trim: true,
        match: [/^(\+92|0)[0-9]{10}$/, "Please provide a valid Pakistani phone number"],
      },
    },
    items: {
      type: [orderItemSchema],
      required: [true, "Order must have at least one item"],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: "Order must have at least one item",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, "Shipping address is required"],
    },
    payment: {
      type: paymentSchema,
      required: [true, "Payment information is required"],
    },
    pricing: {
      subtotal: {
        type: Number,
        required: [true, "Subtotal is required"],
        min: [0, "Subtotal cannot be negative"],
      },
      shippingFee: {
        type: Number,
        required: [true, "Shipping fee is required"],
        min: [0, "Shipping fee cannot be negative"],
        default: 0,
      },
      total: {
        type: Number,
        required: [true, "Total is required"],
        min: [0, "Total cannot be negative"],
      },
    },
    status: {
      type: String,
      enum: {
        values: [
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
        ],
        message: "{VALUE} is not a valid order status",
      },
      default: "pending",
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    trackingNumber: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [300, "Cancellation reason cannot exceed 300 characters"],
      default: null,
    },
    deliveredAt: {
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
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "payment.method": 1 });
orderSchema.index({ "payment.status": 1 });
// Compound index for guest order tracking (orderNumber + phone)
orderSchema.index({ orderNumber: 1, "shippingAddress.phone": 1 });

// ─────────────────────────────────────────────
// PRE-SAVE: GENERATE ORDER NUMBER
// ─────────────────────────────────────────────
orderSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  const year = new Date().getFullYear();
  const count = await mongoose.model("Order").countDocuments();
  const padded = String(count + 1).padStart(5, "0");
  this.orderNumber = `ZEE-${year}-${padded}`;

  // Push initial status to history
  this.statusHistory.push({
    status: "pending",
    note: "Order placed successfully",
    timestamp: new Date(),
  });

  next();
});

// ─────────────────────────────────────────────
// PRE-SAVE: AUTO-SET TIMESTAMPS ON STATUS CHANGE
// ─────────────────────────────────────────────
orderSchema.pre("save", function (next) {
  if (!this.isModified("status")) return next();

  if (this.status === "delivered" && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }
  if (this.status === "cancelled" && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }

  next();
});

// ─────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────
orderSchema.virtual("itemCount").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.virtual("canBeCancelled").get(function () {
  return ["pending", "confirmed"].includes(this.status);
});

// ─────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────
orderSchema.methods.addStatusHistory = function (status, note = "", changedBy = null) {
  this.status = status;
  this.statusHistory.push({ status, note, changedBy, timestamp: new Date() });
};

// ─────────────────────────────────────────────
// TRANSFORM
// ─────────────────────────────────────────────
orderSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Order = mongoose.model("Order", orderSchema);

export default Order;