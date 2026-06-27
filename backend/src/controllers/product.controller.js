import { productService } from "../services/product.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─────────────────────────────────────────────
// PUBLIC CONTROLLERS
// ─────────────────────────────────────────────

/**
 * GET /api/v1/products
 * Public product catalog with filtering, sorting, searching, and pagination.
 *
 * Query params:
 *   page, limit, category, sortBy, minPrice, maxPrice,
 *   color, size, inStock, isFeatured, search
 */
const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);

  return res.status(200).json(
    new ApiResponse(200, result, "Products fetched successfully.")
  );
});

/**
 * GET /api/v1/products/featured
 * Homepage featured products — up to 8 products with isFeatured: true.
 */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 8, 20);
  const products = await productService.getFeaturedProducts(limit);

  return res.status(200).json(
    new ApiResponse(200, { products }, "Featured products fetched successfully.")
  );
});

/**
 * GET /api/v1/products/filters
 * Returns all available filter options for the catalog sidebar:
 * distinct colors, sizes, price range, and categories.
 */
const getFilterMeta = asyncHandler(async (_req, res) => {
  const filters = await productService.getFilterMeta();

  return res.status(200).json(
    new ApiResponse(200, { filters }, "Filter options fetched successfully.")
  );
});

/**
 * GET /api/v1/products/:slug
 * Single product detail page by URL slug.
 * Also returns related products in the same category.
 */
const getProductBySlug = asyncHandler(async (req, res) => {
  const { product, related } = await productService.getProductBySlug(
    req.params.slug
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { product, related },
      "Product fetched successfully."
    )
  );
});

// ─────────────────────────────────────────────
// ADMIN CONTROLLERS
// ─────────────────────────────────────────────

/**
 * GET /api/v1/products/admin/all
 * Admin product listing — includes inactive products.
 *
 * Query params: page, limit, category, isActive, search
 */
const getProductsAdmin = asyncHandler(async (req, res) => {
  const result = await productService.getProductsAdmin(req.query);

  return res.status(200).json(
    new ApiResponse(200, result, "Admin products fetched successfully.")
  );
});

/**
 * GET /api/v1/products/admin/:id
 * Admin: get single product by MongoDB ID (includes inactive).
 */
const getProductByIdAdmin = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  return res.status(200).json(
    new ApiResponse(200, { product }, "Product fetched successfully.")
  );
});

/**
 * POST /api/v1/products
 * Admin: create a new product.
 * Images are added separately via POST /products/:id/images.
 *
 * Body: { name, description, category, variants[], tags[], isFeatured, isActive }
 */
const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);

  return res.status(201).json(
    new ApiResponse(201, { product }, "Product created successfully.")
  );
});

/**
 * PUT /api/v1/products/:id
 * Admin: update product core fields.
 * Does NOT update variants or images (dedicated endpoints below).
 *
 * Body: { name?, description?, category?, tags?, isFeatured?, isActive? }
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);

  return res.status(200).json(
    new ApiResponse(200, { product }, "Product updated successfully.")
  );
});

/**
 * DELETE /api/v1/products/:id
 * Admin: soft-delete a product (sets isActive: false).
 * Preserves historical order data integrity.
 */
const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Product deactivated successfully. It will no longer appear in the catalog."
    )
  );
});

// ─────────────────────────────────────────────
// IMAGE MANAGEMENT CONTROLLERS
// ─────────────────────────────────────────────

/**
 * POST /api/v1/products/:id/images
 * Admin: add a Cloudinary-uploaded image to a product.
 *
 * Body: { url, publicId, alt?, isPrimary? }
 * (Cloudinary upload happens via /api/v1/upload before calling this)
 */
const addProductImage = asyncHandler(async (req, res) => {
  const { url, publicId, alt, isPrimary } = req.body;

  if (!url) {
    // Guard: url is required — publicId alone is insufficient
    return res.status(400).json(
      new ApiResponse(400, null, "Image URL is required.")
    );
  }

  const product = await productService.addProductImage(req.params.id, {
    url,
    publicId,
    alt: alt || "",
    isPrimary: isPrimary || false,
  });

  return res.status(201).json(
    new ApiResponse(201, { images: product.images }, "Image added successfully.")
  );
});

/**
 * DELETE /api/v1/products/:id/images/:imageId
 * Admin: remove an image from a product by its sub-document _id.
 * Note: Cloudinary deletion should be handled separately via publicId.
 */
const removeProductImage = asyncHandler(async (req, res) => {
  const product = await productService.removeProductImage(
    req.params.id,
    req.params.imageId
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { images: product.images },
      "Image removed successfully."
    )
  );
});

// ─────────────────────────────────────────────
// VARIANT MANAGEMENT CONTROLLERS
// ─────────────────────────────────────────────

/**
 * POST /api/v1/products/:id/variants
 * Admin: add a new color/size variant to an existing product.
 *
 * Body: { color, colorHex?, size, price, comparePrice?, stock, sku? }
 */
const addVariant = asyncHandler(async (req, res) => {
  const product = await productService.addVariant(req.params.id, req.body);

  return res.status(201).json(
    new ApiResponse(
      201,
      { variants: product.variants },
      "Variant added successfully."
    )
  );
});

/**
 * PUT /api/v1/products/:id/variants/:variantId
 * Admin: update a specific variant's color, size, price, or stock.
 *
 * Body: { color?, colorHex?, size?, price?, comparePrice?, stock?, sku? }
 */
const updateVariant = asyncHandler(async (req, res) => {
  const product = await productService.updateVariant(
    req.params.id,
    req.params.variantId,
    req.body
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { variants: product.variants },
      "Variant updated successfully."
    )
  );
});

/**
 * DELETE /api/v1/products/:id/variants/:variantId
 * Admin: remove a variant from a product.
 * Prevented if it's the last variant.
 */
const removeVariant = asyncHandler(async (req, res) => {
  const product = await productService.removeVariant(
    req.params.id,
    req.params.variantId
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { variants: product.variants },
      "Variant removed successfully."
    )
  );
});

export const productController = {
  // Public
  getProducts,
  getFeaturedProducts,
  getFilterMeta,
  getProductBySlug,
  // Admin
  getProductsAdmin,
  getProductByIdAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  // Images
  addProductImage,
  removeProductImage,
  // Variants
  addVariant,
  updateVariant,
  removeVariant,
};