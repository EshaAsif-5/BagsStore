import { body, query, param } from "express-validator";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
export const VALID_PAYMENT_METHODS = [
  "cod",
  "bank_transfer",
  "easypaisa",
  "jazzcash",
  "card",
];

export const VALID_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const VALID_PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Gilgit-Baltistan",
  "Azad Kashmir",
  "Islamabad Capital Territory",
];

// ─────────────────────────────────────────────
// PLACE ORDER
// ─────────────────────────────────────────────
export const validatePlaceOrder = [
  // ── Cart Items ──────────────────────────────
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must contain at least one item."),

  body("items.*.productId")
    .notEmpty()
    .withMessage("Each item must have a productId.")
    .isMongoId()
    .withMessage("Each productId must be a valid ID."),

  body("items.*.variantId")
    .notEmpty()
    .withMessage("Each item must have a variantId.")
    .isMongoId()
    .withMessage("Each variantId must be a valid ID."),

  body("items.*.quantity")
    .notEmpty()
    .withMessage("Each item must have a quantity.")
    .isInt({ min: 1, max: 50 })
    .withMessage("Item quantity must be between 1 and 50.")
    .toInt(),

  // ── Shipping Address ────────────────────────
  body("shippingAddress.fullName")
    .trim()
    .notEmpty()
    .withMessage("Recipient full name is required.")
    .isLength({ max: 80 })
    .withMessage("Full name cannot exceed 80 characters."),

  body("shippingAddress.phone")
    .trim()
    .notEmpty()
    .withMessage("Recipient phone number is required.")
    .matches(/^(\+92|0)[0-9]{10}$/)
    .withMessage("Please provide a valid Pakistani phone number (e.g. 03001234567)."),

  body("shippingAddress.street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required.")
    .isLength({ max: 200 })
    .withMessage("Street address cannot exceed 200 characters."),

  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required.")
    .isLength({ max: 60 })
    .withMessage("City name cannot exceed 60 characters."),

  body("shippingAddress.province")
    .trim()
    .notEmpty()
    .withMessage("Province is required.")
    .isIn(VALID_PROVINCES)
    .withMessage(`Province must be one of: ${VALID_PROVINCES.join(", ")}.`),

  body("shippingAddress.postalCode")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[0-9]{5}$/)
    .withMessage("Postal code must be exactly 5 digits."),

  // ── Payment ─────────────────────────────────
  body("paymentMethod")
    .trim()
    .notEmpty()
    .withMessage("Payment method is required.")
    .isIn(VALID_PAYMENT_METHODS)
    .withMessage(
      `Payment method must be one of: ${VALID_PAYMENT_METHODS.join(", ")}.`
    ),

  // ── Payment Proof (required for non-COD) ────
  body("paymentTransactionId")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Transaction ID cannot exceed 100 characters."),

  body("paymentProof")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL()
    .withMessage("Payment proof must be a valid URL."),

  // ── Guest Info (required if not authenticated) ──
  body("guestName")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Guest name must be between 2 and 80 characters."),

  body("guestEmail")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("guestPhone")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^(\+92|0)[0-9]{10}$/)
    .withMessage("Please provide a valid Pakistani phone number."),

  // ── Optional order note ──────────────────────
  body("notes")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Order notes cannot exceed 500 characters."),
];

// ─────────────────────────────────────────────
// UPDATE ORDER STATUS (Admin)
// ─────────────────────────────────────────────
export const validateUpdateStatus = [
  body("status")
    .trim()
    .notEmpty()
    .withMessage("Order status is required.")
    .isIn(VALID_ORDER_STATUSES)
    .withMessage(
      `Status must be one of: ${VALID_ORDER_STATUSES.join(", ")}.`
    ),

  body("note")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage("Status note cannot exceed 300 characters."),

  body("trackingNumber")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Tracking number cannot exceed 100 characters."),
];

// ─────────────────────────────────────────────
// CANCEL ORDER (Customer)
// ─────────────────────────────────────────────
export const validateCancelOrder = [
  body("reason")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage("Cancellation reason cannot exceed 300 characters."),
];

// ─────────────────────────────────────────────
// TRACK ORDER (Public)
// ─────────────────────────────────────────────
export const validateTrackOrder = [
  query("orderNumber")
    .trim()
    .notEmpty()
    .withMessage("Order number is required.")
    .matches(/^ZEE-\d{4}-\d{5}$/)
    .withMessage("Invalid order number format. Expected format: ZEE-YYYY-NNNNN."),

  query("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required for order tracking.")
    .matches(/^(\+92|0)[0-9]{10}$/)
    .withMessage("Please provide the Pakistani phone number used during checkout."),
];

// ─────────────────────────────────────────────
// ADMIN ORDER LISTING QUERY PARAMS
// ─────────────────────────────────────────────
export const validateAdminOrderQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100.")
    .toInt(),

  query("status")
    .optional()
    .isIn(VALID_ORDER_STATUSES)
    .withMessage(`Status must be one of: ${VALID_ORDER_STATUSES.join(", ")}.`),

  query("paymentMethod")
    .optional()
    .isIn(VALID_PAYMENT_METHODS)
    .withMessage(
      `Payment method must be one of: ${VALID_PAYMENT_METHODS.join(", ")}.`
    ),

  query("sortBy")
    .optional()
    .isIn(["newest", "oldest", "total-asc", "total-desc"])
    .withMessage("sortBy must be one of: newest, oldest, total-asc, total-desc."),
];

// ─────────────────────────────────────────────
// PARAM VALIDATOR
// ─────────────────────────────────────────────
export const validateObjectIdParam = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}. Must be a valid ID.`),
];