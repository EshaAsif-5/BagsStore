import { body, query, param } from "express-validator";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
export const VALID_CATEGORIES = ["university", "modern", "luxury", "stylish"];

export const VALID_SORT_OPTIONS = [
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "rating-desc",
  "popular",
  "featured",
];

// ─────────────────────────────────────────────
// SHARED SUB-VALIDATORS
// ─────────────────────────────────────────────
const variantBodyRules = (prefix = "") => [
  body(`${prefix}color`)
    .trim()
    .notEmpty()
    .withMessage("Variant color is required.")
    .isLength({ max: 40 })
    .withMessage("Color name cannot exceed 40 characters."),

  body(`${prefix}colorHex`)
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage("Color hex must be a valid hex code (e.g. #fff or #ffffff)."),

  body(`${prefix}size`)
    .trim()
    .notEmpty()
    .withMessage("Variant size is required.")
    .isLength({ max: 20 })
    .withMessage("Size cannot exceed 20 characters."),

  body(`${prefix}price`)
    .notEmpty()
    .withMessage("Variant price is required.")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number.")
    .toFloat(),

  body(`${prefix}comparePrice`)
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Compare price must be a positive number.")
    .toFloat()
    .custom((value, { req }) => {
      const price =
        prefix
          ? parseFloat(req.body[prefix.replace(".", "")]?.price)
          : parseFloat(req.body.price);
      if (value !== null && value !== undefined && !isNaN(price) && value <= price) {
        throw new Error("Compare price must be greater than the selling price.");
      }
      return true;
    }),

  body(`${prefix}stock`)
    .notEmpty()
    .withMessage("Variant stock quantity is required.")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer.")
    .toInt(),

  body(`${prefix}sku`)
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("SKU cannot exceed 50 characters.")
    .toUpperCase(),
];

// ─────────────────────────────────────────────
// CREATE PRODUCT
// ─────────────────────────────────────────────
export const validateCreateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required.")
    .isLength({ min: 3, max: 150 })
    .withMessage("Product name must be between 3 and 150 characters."),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Product description is required.")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters."),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required.")
    .isIn(VALID_CATEGORIES)
    .withMessage(
      `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`
    ),

  body("variants")
    .isArray({ min: 1 })
    .withMessage("At least one product variant is required."),

  // Validate each variant in the array
  body("variants.*.color")
    .trim()
    .notEmpty()
    .withMessage("Each variant must have a color.")
    .isLength({ max: 40 })
    .withMessage("Variant color cannot exceed 40 characters."),

  body("variants.*.colorHex")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage("Color hex must be a valid hex code (e.g. #fff or #ffffff)."),

  body("variants.*.size")
    .trim()
    .notEmpty()
    .withMessage("Each variant must have a size.")
    .isLength({ max: 20 })
    .withMessage("Variant size cannot exceed 20 characters."),

  body("variants.*.price")
    .notEmpty()
    .withMessage("Each variant must have a price.")
    .isFloat({ min: 0 })
    .withMessage("Variant price must be a positive number.")
    .toFloat(),

  body("variants.*.comparePrice")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Compare price must be a positive number.")
    .toFloat(),

  body("variants.*.stock")
    .notEmpty()
    .withMessage("Each variant must have a stock quantity.")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer.")
    .toInt(),

  body("variants.*.sku")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("SKU cannot exceed 50 characters."),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array.")
    .custom((tags) => {
      if (tags && tags.length > 20) {
        throw new Error("A product can have a maximum of 20 tags.");
      }
      return true;
    }),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage("Each tag cannot exceed 30 characters."),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean.")
    .toBoolean(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean.")
    .toBoolean(),
];

// ─────────────────────────────────────────────
// UPDATE PRODUCT (all fields optional)
// ─────────────────────────────────────────────
export const validateUpdateProduct = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage("Product name must be between 3 and 150 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters."),

  body("category")
    .optional()
    .trim()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(", ")}.`),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array.")
    .custom((tags) => {
      if (tags && tags.length > 20) {
        throw new Error("A product can have a maximum of 20 tags.");
      }
      return true;
    }),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage("Each tag cannot exceed 30 characters."),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean.")
    .toBoolean(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean.")
    .toBoolean(),
];

// ─────────────────────────────────────────────
// ADD / UPDATE SINGLE VARIANT
// ─────────────────────────────────────────────
export const validateVariant = variantBodyRules("");

export const validateUpdateVariant = [
  body("color")
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage("Color name cannot exceed 40 characters."),

  body("colorHex")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage("Color hex must be a valid hex code."),

  body("size")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Size cannot exceed 20 characters."),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number.")
    .toFloat(),

  body("comparePrice")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Compare price must be a positive number.")
    .toFloat(),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer.")
    .toInt(),

  body("sku")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("SKU cannot exceed 50 characters."),
];

// ─────────────────────────────────────────────
// PRODUCT LISTING / SEARCH QUERY PARAMS
// ─────────────────────────────────────────────
export const validateProductQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50.")
    .toInt(),

  query("category")
    .optional()
    .custom((value) => {
      const cats = Array.isArray(value) ? value : [value];
      const invalid = cats.filter((c) => !VALID_CATEGORIES.includes(c));
      if (invalid.length > 0) {
        throw new Error(
          `Invalid category: "${invalid.join(", ")}". Must be one of: ${VALID_CATEGORIES.join(", ")}.`
        );
      }
      return true;
    }),

  query("sortBy")
    .optional()
    .isIn(VALID_SORT_OPTIONS)
    .withMessage(
      `sortBy must be one of: ${VALID_SORT_OPTIONS.join(", ")}.`
    ),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minPrice must be a non-negative number.")
    .toFloat(),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxPrice must be a non-negative number.")
    .toFloat()
    .custom((maxPrice, { req }) => {
      const minPrice = parseFloat(req.query.minPrice);
      if (!isNaN(minPrice) && maxPrice < minPrice) {
        throw new Error("maxPrice must be greater than or equal to minPrice.");
      }
      return true;
    }),

  query("inStock")
    .optional()
    .isBoolean()
    .withMessage("inStock must be true or false."),

  query("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be true or false."),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query cannot exceed 100 characters."),

  query("color")
    .optional()
    .custom((value) => {
      const colors = Array.isArray(value) ? value : [value];
      if (colors.some((c) => c.length > 40)) {
        throw new Error("Each color filter value cannot exceed 40 characters.");
      }
      return true;
    }),

  query("size")
    .optional()
    .custom((value) => {
      const sizes = Array.isArray(value) ? value : [value];
      if (sizes.some((s) => s.length > 20)) {
        throw new Error("Each size filter value cannot exceed 20 characters.");
      }
      return true;
    }),
];

// ─────────────────────────────────────────────
// PARAM: MongoDB ObjectId
// ─────────────────────────────────────────────
export const validateObjectIdParam = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}. Must be a valid ID.`),
];

// ─────────────────────────────────────────────
// IMAGE UPLOAD VALIDATION (metadata body fields)
// ─────────────────────────────────────────────
export const validateImageMeta = [
  body("alt")
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Image alt text cannot exceed 120 characters."),

  body("isPrimary")
    .optional()
    .isBoolean()
    .withMessage("isPrimary must be a boolean.")
    .toBoolean(),
];