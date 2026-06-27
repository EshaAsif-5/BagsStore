import { productRepository } from "../repositories/product.repository.js";
import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────────
// PRODUCT SERVICE
// Business logic layer — orchestrates repository
// calls, enforces rules, and handles domain errors.
// ─────────────────────────────────────────────

/**
 * Get a paginated, filtered, sorted product listing.
 * Used by the public catalog page.
 */
const getProducts = async (queryParams) => {
  // Force isActive=true for public listing
  const params = { ...queryParams, isActive: true };
  return productRepository.findAll(params);
};

/**
 * Get products for admin — includes inactive products.
 */
const getProductsAdmin = async (queryParams) => {
  return productRepository.findAllAdmin(queryParams);
};

/**
 * Get featured products for the homepage hero / featured section.
 */
const getFeaturedProducts = async (limit = 8) => {
  const products = await productRepository.findFeatured(limit);
  return products;
};

/**
 * Get a single product by slug for the product detail page.
 * Includes related products in the same category.
 */
const getProductBySlug = async (slug) => {
  const product = await productRepository.findBySlug(slug);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const related = await productRepository.findRelated(
    product.category,
    product._id,
    4
  );

  return { product, related };
};

/**
 * Get a single product by ID — admin use.
 * Can access inactive products.
 */
const getProductById = async (id) => {
  const product = await productRepository.findById(id, true);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }
  return product;
};

/**
 * Get filter metadata for the catalog sidebar:
 * available colors, sizes, and price range.
 */
const getFilterMeta = async () => {
  const [colors, sizes, priceRange] = await Promise.all([
    productRepository.findDistinctColors(),
    productRepository.findDistinctSizes(),
    productRepository.findPriceRange(),
  ]);

  return {
    colors: colors.sort(),
    sizes: sizes.sort(),
    priceRange,
    categories: ["university", "modern", "luxury", "stylish"],
  };
};

/**
 * Create a new product.
 * Validates that at least one variant is provided.
 * Image URLs are handled separately via the upload flow.
 */
const createProduct = async (productData) => {
  const {
    name,
    description,
    category,
    variants,
    tags,
    isFeatured,
    isActive,
  } = productData;

  if (!variants || variants.length === 0) {
    throw new ApiError(400, "At least one product variant is required.");
  }

  // Validate variant price/comparePrice consistency
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (
      v.comparePrice !== null &&
      v.comparePrice !== undefined &&
      v.comparePrice <= v.price
    ) {
      throw new ApiError(
        400,
        `Variant ${i + 1}: Compare price must be greater than the selling price.`
      );
    }
  }

  const product = await productRepository.createProduct({
    name,
    description,
    category,
    variants,
    tags: tags || [],
    isFeatured: isFeatured ?? false,
    isActive: isActive ?? true,
    images: [],
  });

  return product;
};

/**
 * Update core product fields (name, description, category, tags, flags).
 * Variants and images are managed via dedicated endpoints.
 */
const updateProduct = async (productId, updates) => {
  const product = await productRepository.findById(productId, true);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  // Whitelist updatable top-level fields
  const allowedUpdates = [
    "name",
    "description",
    "category",
    "tags",
    "isFeatured",
    "isActive",
  ];

  const sanitizedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowedUpdates.includes(key))
  );

  if (Object.keys(sanitizedUpdates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update.");
  }

  const updated = await productRepository.updateProduct(
    productId,
    sanitizedUpdates
  );

  return updated;
};

/**
 * Soft-delete a product — sets isActive: false.
 * Preserves integrity of existing orders referencing this product.
 */
const deleteProduct = async (productId) => {
  const product = await productRepository.findById(productId, true);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  await productRepository.softDeleteProduct(productId);
};

/**
 * Add an image to a product.
 * Accepts pre-uploaded Cloudinary data (url, publicId, alt, isPrimary).
 */
const addProductImage = async (productId, imageData) => {
  const product = await productRepository.findById(productId, true);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (product.images.length >= 10) {
    throw new ApiError(400, "A product can have a maximum of 10 images.");
  }

  // If no images yet, make this one primary automatically
  const enrichedImage = {
    ...imageData,
    isPrimary: product.images.length === 0 ? true : (imageData.isPrimary ?? false),
  };

  // If this image is set as primary, demote all others
  if (enrichedImage.isPrimary) {
    await productRepository.updateProduct(productId, {
      "images.$[].isPrimary": false,
    });
  }

  const updated = await productRepository.addImage(productId, enrichedImage);
  return updated;
};

/**
 * Remove an image from a product by its sub-document _id.
 */
const removeProductImage = async (productId, imageId) => {
  const product = await productRepository.findById(productId, true);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const imageExists = product.images.some(
    (img) => img._id.toString() === imageId
  );
  if (!imageExists) {
    throw new ApiError(404, "Image not found on this product.");
  }

  const updated = await productRepository.removeImage(productId, imageId);

  // If the removed image was primary and others exist, promote first remaining
  const wasRemoved = !updated.images.some(
    (img) => img._id.toString() === imageId
  );
  if (wasRemoved && updated.images.length > 0) {
    const hasPrimary = updated.images.some((img) => img.isPrimary);
    if (!hasPrimary) {
      updated.images[0].isPrimary = true;
      await updated.save();
    }
  }

  return updated;
};

/**
 * Add a new variant to an existing product.
 */
const addVariant = async (productId, variantData) => {
  const product = await productRepository.findById(productId, true);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (
    variantData.comparePrice !== null &&
    variantData.comparePrice !== undefined &&
    variantData.comparePrice <= variantData.price
  ) {
    throw new ApiError(
      400,
      "Compare price must be greater than the selling price."
    );
  }

  const updated = await productRepository.addVariant(productId, variantData);
  return updated;
};

/**
 * Update a specific variant's fields.
 */
const updateVariant = async (productId, variantId, updates) => {
  const product = await productRepository.findById(productId, true);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const variantExists = product.variants.some(
    (v) => v._id.toString() === variantId
  );
  if (!variantExists) {
    throw new ApiError(404, "Variant not found on this product.");
  }

  if (
    updates.comparePrice !== null &&
    updates.comparePrice !== undefined &&
    updates.price !== undefined &&
    updates.comparePrice <= updates.price
  ) {
    throw new ApiError(
      400,
      "Compare price must be greater than the selling price."
    );
  }

  const updated = await productRepository.updateVariant(
    productId,
    variantId,
    updates
  );
  return updated;
};

/**
 * Remove a variant from a product.
 * Prevents removing the last remaining variant.
 */
const removeVariant = async (productId, variantId) => {
  const product = await productRepository.findById(productId, true);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (product.variants.length <= 1) {
    throw new ApiError(
      400,
      "Cannot remove the last variant. A product must have at least one variant."
    );
  }

  const variantExists = product.variants.some(
    (v) => v._id.toString() === variantId
  );
  if (!variantExists) {
    throw new ApiError(404, "Variant not found on this product.");
  }

  const updated = await productRepository.removeVariant(productId, variantId);
  return updated;
};

export const productService = {
  getProducts,
  getProductsAdmin,
  getFeaturedProducts,
  getProductBySlug,
  getProductById,
  getFilterMeta,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  removeProductImage,
  addVariant,
  updateVariant,
  removeVariant,
};