import Product from "../models/Product.model.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// PRODUCT REPOSITORY
// Pure database access layer — no business logic.
// All query composition, filtering, sorting, and
// pagination lives here.
// ─────────────────────────────────────────────

/**
 * Build a reusable filter object from query params.
 * Called by findAll and countAll to keep filters in sync.
 */
const buildFilterQuery = ({
  category,
  color,
  size,
  minPrice,
  maxPrice,
  inStock,
  isFeatured,
  search,
  isActive = true, // Always filter inactive unless admin explicitly passes false
}) => {
  const filter = {};

  // Active status — admins can pass isActive=false to see deactivated products
  if (isActive !== undefined && isActive !== null) {
    filter.isActive = isActive === "false" || isActive === false ? false : true;
  }

  // Category filter
  if (category) {
    filter.category = { $in: Array.isArray(category) ? category : [category] };
  }

  // Featured filter
  if (isFeatured !== undefined && isFeatured !== null) {
    filter.isFeatured = isFeatured === "true" || isFeatured === true;
  }

  // Color filter — match against variants.color (case-insensitive)
  if (color) {
    const colors = Array.isArray(color) ? color : [color];
    filter["variants.color"] = {
      $in: colors.map((c) => new RegExp(`^${c}$`, "i")),
    };
  }

  // Size filter — match against variants.size (case-insensitive)
  if (size) {
    const sizes = Array.isArray(size) ? size : [size];
    filter["variants.size"] = {
      $in: sizes.map((s) => new RegExp(`^${s}$`, "i")),
    };
  }

  // Price range — filter on minimum variant price using $expr
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceConditions = {};
    if (minPrice !== undefined) {
      priceConditions.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined) {
      priceConditions.$lte = Number(maxPrice);
    }
    filter["variants.price"] = priceConditions;
  }

  // In-stock filter — at least one variant with stock > 0
  if (inStock === "true" || inStock === true) {
    filter["variants.stock"] = { $gt: 0 };
  }

  // Full-text search on name, description, tags (text index on model)
  if (search && search.trim()) {
    filter.$text = { $search: search.trim() };
  }

  return filter;
};

/**
 * Build sort object from sortBy param.
 */
const buildSortQuery = (sortBy, hasTextSearch = false) => {
  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    "price-asc": { "variants.price": 1 },
    "price-desc": { "variants.price": -1 },
    "rating-desc": { averageRating: -1 },
    popular: { reviewCount: -1, averageRating: -1 },
    featured: { isFeatured: -1, createdAt: -1 },
  };

  // When using text search, default to relevance score sort
  if (hasTextSearch && !sortBy) {
    return { score: { $meta: "textScore" } };
  }

  return sortMap[sortBy] || { createdAt: -1 };
};

// ─────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────

/**
 * Paginated product listing with filters, sorting, and text search.
 * Returns { products, total, page, limit, totalPages }
 */
const findAll = async (queryParams) => {
  const {
    page = 1,
    limit = 12,
    sortBy,
    ...filterParams
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Cap at 50 per page
  const skip = (pageNum - 1) * limitNum;

  const hasTextSearch = Boolean(filterParams.search?.trim());
  const filter = buildFilterQuery(filterParams);
  const sort = buildSortQuery(sortBy, hasTextSearch);

  // Projection — include textScore only when searching
  const projection = hasTextSearch
    ? { score: { $meta: "textScore" } }
    : {};

  const [products, total] = await Promise.all([
    Product.find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select(
        "name slug category images variants tags isFeatured averageRating reviewCount createdAt"
      )
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    hasNextPage: pageNum < Math.ceil(total / limitNum),
    hasPrevPage: pageNum > 1,
  };
};

/**
 * Find a single product by its slug (public-facing).
 * Populates full product data including all variants.
 */
const findBySlug = (slug, includeInactive = false) => {
  const filter = { slug };
  if (!includeInactive) filter.isActive = true;
  return Product.findOne(filter);
};

/**
 * Find a product by its MongoDB ObjectId.
 * Used internally (admin updates, order processing).
 */
const findById = (id, includeInactive = false) => {
  const filter = { _id: id };
  if (!includeInactive) filter.isActive = true;
  return Product.findById(filter);
};

/**
 * Find multiple products by IDs — used for cart/wishlist population.
 */
const findByIds = (ids) => {
  return Product.find({
    _id: { $in: ids },
    isActive: true,
  }).select("name slug images variants isActive category");
};

/**
 * Get featured products for the homepage.
 */
const findFeatured = (limit = 8) => {
  return Product.find({ isFeatured: true, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name slug category images variants averageRating reviewCount")
    .lean();
};

/**
 * Get products in the same category (related products).
 * Excludes the current product.
 */
const findRelated = (category, excludeId, limit = 4) => {
  return Product.find({
    category,
    isActive: true,
    _id: { $ne: excludeId },
  })
    .sort({ averageRating: -1, createdAt: -1 })
    .limit(limit)
    .select("name slug images variants averageRating reviewCount")
    .lean();
};

/**
 * Get all distinct colors across all products (for filter UI).
 */
const findDistinctColors = () => {
  return Product.distinct("variants.color", { isActive: true });
};

/**
 * Get all distinct sizes across all products (for filter UI).
 */
const findDistinctSizes = () => {
  return Product.distinct("variants.size", { isActive: true });
};

/**
 * Get the min and max price range across all active products.
 */
const findPriceRange = async () => {
  const result = await Product.aggregate([
    { $match: { isActive: true } },
    { $unwind: "$variants" },
    {
      $group: {
        _id: null,
        minPrice: { $min: "$variants.price" },
        maxPrice: { $max: "$variants.price" },
      },
    },
  ]);
  return result[0] || { minPrice: 0, maxPrice: 0 };
};

/**
 * Create a new product document.
 */
const createProduct = async (data) => {
  const product = new Product(data);
  await product.save();
  return product;
};

/**
 * Update a product by ID.
 * Returns the updated document.
 */
const updateProduct = (id, updates) => {
  return Product.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
};

/**
 * Soft-delete a product by setting isActive to false.
 * Preserves order history integrity.
 */
const softDeleteProduct = (id) => {
  return Product.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
};

/**
 * Hard-delete — only for admin use on products with no orders.
 */
const hardDeleteProduct = (id) => {
  return Product.findByIdAndDelete(id);
};

/**
 * Add an image to the product's images array.
 */
const addImage = (productId, imageData) => {
  return Product.findByIdAndUpdate(
    productId,
    { $push: { images: imageData } },
    { new: true, runValidators: true }
  );
};

/**
 * Remove an image from the product's images array by image _id.
 */
const removeImage = (productId, imageId) => {
  return Product.findByIdAndUpdate(
    productId,
    { $pull: { images: { _id: new mongoose.Types.ObjectId(imageId) } } },
    { new: true }
  );
};

/**
 * Add a new variant to the product's variants array.
 */
const addVariant = (productId, variantData) => {
  return Product.findByIdAndUpdate(
    productId,
    { $push: { variants: variantData } },
    { new: true, runValidators: true }
  );
};

/**
 * Update a specific variant by its _id using positional $ operator.
 */
const updateVariant = async (productId, variantId, updates) => {
  const product = await Product.findById(productId);
  if (!product) return null;

  const variant = product.variants.id(variantId);
  if (!variant) return null;

  Object.assign(variant, updates);
  await product.save();
  return product;
};

/**
 * Remove a variant from the product's variants array.
 */
const removeVariant = async (productId, variantId) => {
  const product = await Product.findById(productId);
  if (!product) return null;

  if (product.variants.length <= 1) {
    throw new Error("Product must have at least one variant.");
  }

  product.variants = product.variants.filter(
    (v) => v._id.toString() !== variantId.toString()
  );
  await product.save();
  return product;
};

/**
 * Decrement stock for a specific variant — used during order placement.
 * Uses $inc for atomic updates to prevent race conditions.
 */
const decrementVariantStock = (productId, variantId, quantity) => {
  return Product.findOneAndUpdate(
    {
      _id: productId,
      "variants._id": variantId,
      "variants.stock": { $gte: quantity }, // Only update if enough stock
    },
    {
      $inc: { "variants.$.stock": -quantity },
    },
    { new: true }
  );
};

/**
 * Increment stock for a variant — used on order cancellation.
 */
const incrementVariantStock = (productId, variantId, quantity) => {
  return Product.findOneAndUpdate(
    { _id: productId, "variants._id": variantId },
    { $inc: { "variants.$.stock": quantity } },
    { new: true }
  );
};

/**
 * Check if a specific variant has sufficient stock.
 */
const checkVariantStock = async (productId, variantId, quantity) => {
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    "variants._id": variantId,
  }).select("variants");

  if (!product) return { available: false, stock: 0 };

  const variant = product.variants.id(variantId);
  if (!variant) return { available: false, stock: 0 };

  return {
    available: variant.stock >= quantity,
    stock: variant.stock,
  };
};

/**
 * Admin: get all products including inactive, with full data.
 */
const findAllAdmin = async ({ page = 1, limit = 20, category, isActive, search }) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (category) filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search?.trim()) filter.$text = { $search: search.trim() };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

export const productRepository = {
  findAll,
  findBySlug,
  findById,
  findByIds,
  findFeatured,
  findRelated,
  findDistinctColors,
  findDistinctSizes,
  findPriceRange,
  createProduct,
  updateProduct,
  softDeleteProduct,
  hardDeleteProduct,
  addImage,
  removeImage,
  addVariant,
  updateVariant,
  removeVariant,
  decrementVariantStock,
  incrementVariantStock,
  checkVariantStock,
  findAllAdmin,
};