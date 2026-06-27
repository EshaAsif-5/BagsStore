import { Router } from "express";
import { productController } from "../controllers/product.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateVariant,
  validateUpdateVariant,
  validateProductQuery,
  validateObjectIdParam,
  validateImageMeta,
} from "../validators/product.validators.js";

const router = Router();

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// Specific paths must be defined BEFORE /:slug
// to prevent "featured" or "filters" matching as slugs.
// ─────────────────────────────────────────────

/**
 * GET /api/v1/products
 * Public product catalog with filtering, sorting, searching, and pagination.
 */
router.get(
  "/",
  validateProductQuery,
  validate,
  productController.getProducts
);

/**
 * GET /api/v1/products/featured
 * Homepage featured products.
 */
router.get("/featured", productController.getFeaturedProducts);

/**
 * GET /api/v1/products/filters
 * Catalog sidebar filter metadata.
 */
router.get("/filters", productController.getFilterMeta);

// ─────────────────────────────────────────────
// ADMIN ROUTES
// Must be defined BEFORE /:slug to avoid "admin"
// being captured as a product slug.
// ─────────────────────────────────────────────

/**
 * GET /api/v1/products/admin/all
 * Admin: paginated product list including inactive products.
 */
router.get(
  "/admin/all",
  verifyToken,
  requireAdmin,
  validateProductQuery,
  validate,
  productController.getProductsAdmin
);

/**
 * GET /api/v1/products/admin/:id
 * Admin: get single product by MongoDB ID.
 */
router.get(
  "/admin/:id",
  verifyToken,
  requireAdmin,
  validateObjectIdParam("id"),
  validate,
  productController.getProductByIdAdmin
);

/**
 * POST /api/v1/products
 * Admin: create a new product.
 */
router.post(
  "/",
  verifyToken,
  requireAdmin,
  validateCreateProduct,
  validate,
  productController.createProduct
);

// ─────────────────────────────────────────────
// ADMIN — VARIANT & IMAGE ROUTES (by MongoDB :id)
// Defined before PUT/DELETE /:id and before /:slug.
// ─────────────────────────────────────────────

/**
 * POST /api/v1/products/:id/variants
 * Admin: add a variant to a product.
 */
router.post(
  "/:id/variants",
  verifyToken,
  requireAdmin,
  validateObjectIdParam("id"),
  validateVariant,
  validate,
  productController.addVariant
);

/**
 * PUT /api/v1/products/:id/variants/:variantId
 * Admin: update a specific variant.
 */
router.put(
  "/:id/variants/:variantId",
  verifyToken,
  requireAdmin,
  validateObjectIdParam("id"),
  validateObjectIdParam("variantId"),
  validateUpdateVariant,
  validate,
  productController.updateVariant
);

/**
 * DELETE /api/v1/products/:id/variants/:variantId
 * Admin: remove a variant from a product.
 */
router.delete(
  "/:id/variants/:variantId",
  verifyToken,
  requireAdmin,
  validateObjectIdParam("id"),
  validateObjectIdParam("variantId"),
  validate,
  productController.removeVariant
);

/**
 * POST /api/v1/products/:id/images
 * Admin: add an image to a product.
 */
router.post(
  "/:id/images",
  verifyToken,
  requireAdmin,
  validateObjectIdParam("id"),
  validateImageMeta,
  validate,
  productController.addProductImage
);

/**
 * DELETE /api/v1/products/:id/images/:imageId
 * Admin: remove an image from a product.
 */
router.delete(
  "/:id/images/:imageId",
  verifyToken,
  requireAdmin,
  validateObjectIdParam("id"),
  validateObjectIdParam("imageId"),
  validate,
  productController.removeProductImage
);

/**
 * PUT /api/v1/products/:id
 * Admin: update product core fields.
 */
router.put(
  "/:id",
  verifyToken,
  requireAdmin,
  validateObjectIdParam("id"),
  validateUpdateProduct,
  validate,
  productController.updateProduct
);

/**
 * DELETE /api/v1/products/:id
 * Admin: soft-delete a product.
 */
router.delete(
  "/:id",
  verifyToken,
  requireAdmin,
  validateObjectIdParam("id"),
  validate,
  productController.deleteProduct
);

// ─────────────────────────────────────────────
// PUBLIC — SINGLE PRODUCT BY SLUG
// Must be LAST among GET routes — catches any slug.
// ─────────────────────────────────────────────

/**
 * GET /api/v1/products/:slug
 * Public product detail page by URL slug.
 */
router.get("/:slug", productController.getProductBySlug);

export default router;
