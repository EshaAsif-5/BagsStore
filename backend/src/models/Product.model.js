import mongoose from "mongoose";
import slugify from "slugify";

// ─────────────────────────────────────────────
// PRODUCT IMAGE SUB-SCHEMA
// ─────────────────────────────────────────────
const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
    },
    publicId: {
      type: String, // Cloudinary public_id for deletion
      trim: true,
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [120, "Alt text cannot exceed 120 characters"],
      default: "",
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// ─────────────────────────────────────────────
// PRODUCT VARIANT SUB-SCHEMA (color + size)
// ─────────────────────────────────────────────
const variantSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      required: [true, "Variant color is required"],
      trim: true,
      maxlength: [40, "Color name cannot exceed 40 characters"],
    },
    colorHex: {
      type: String,
      trim: true,
      match: [/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Please provide a valid hex color code"],
      default: "#000000",
    },
    size: {
      type: String,
      required: [true, "Variant size is required"],
      trim: true,
      maxlength: [20, "Size cannot exceed 20 characters"],
    },
    price: {
      type: Number,
      required: [true, "Variant price is required"],
      min: [0, "Price cannot be negative"],
    },
    comparePrice: {
      type: Number,
      min: [0, "Compare price cannot be negative"],
      default: null,
      validate: {
        validator: function (val) {
          // comparePrice must be greater than selling price if set
          return val === null || val > this.price;
        },
        message: "Compare price must be greater than the selling price",
      },
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [50, "SKU cannot exceed 50 characters"],
    },
  },
  { _id: true }
);

// ─────────────────────────────────────────────
// PRODUCT SCHEMA
// ─────────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [3, "Product name must be at least 3 characters"],
      maxlength: [150, "Product name cannot exceed 150 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["university", "modern", "luxury", "stylish"],
        message: "{VALUE} is not a valid category. Choose: university, modern, luxury, stylish",
      },
    },
    images: {
      type: [productImageSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "A product can have a maximum of 10 images",
      },
    },
    variants: {
      type: [variantSchema],
      required: [true, "At least one variant is required"],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: "Product must have at least one variant",
      },
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: "A product can have a maximum of 20 tags",
      },
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Denormalized for fast reads — updated via post-save hook on Review
    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Average rating cannot be less than 0"],
      max: [5, "Average rating cannot exceed 5"],
      set: (val) => Math.round(val * 10) / 10, // Round to 1 decimal
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, "Review count cannot be negative"],
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
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: "text", description: "text", tags: "text" }); // Full-text search

// ─────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────
productSchema.virtual("primaryImage").get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary || this.images[0] || null;
});

productSchema.virtual("minPrice").get(function () {
  if (!this.variants || this.variants.length === 0) return 0;
  return Math.min(...this.variants.map((v) => v.price));
});

productSchema.virtual("maxPrice").get(function () {
  if (!this.variants || this.variants.length === 0) return 0;
  return Math.max(...this.variants.map((v) => v.price));
});

productSchema.virtual("totalStock").get(function () {
  if (!this.variants) return 0;
  return this.variants.reduce((sum, v) => sum + v.stock, 0);
});

productSchema.virtual("inStock").get(function () {
  return this.totalStock > 0;
});

// ─────────────────────────────────────────────
// PRE-SAVE: GENERATE UNIQUE SLUG
// ─────────────────────────────────────────────
productSchema.pre("save", async function () {
  if (!this.isModified("name")) return;

  let baseSlug = slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  // Ensure slug uniqueness
  while (await mongoose.model("Product").exists({ slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  this.slug = slug;
});

// ─────────────────────────────────────────────
// PRE-SAVE: ENFORCE SINGLE PRIMARY IMAGE
// ─────────────────────────────────────────────
productSchema.pre("save", function () {
  if (!this.isModified("images")) return;

  const primaryImages = this.images.filter((img) => img.isPrimary);

  if (primaryImages.length > 1) {
    this.images.forEach((img) => (img.isPrimary = false));
    this.images[0].isPrimary = true;
  }

  if (primaryImages.length === 0 && this.images.length > 0) {
    this.images[0].isPrimary = true;
  }
});

// ─────────────────────────────────────────────
// TRANSFORM
// ─────────────────────────────────────────────
productSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Product = mongoose.model("Product", productSchema);

export default Product;