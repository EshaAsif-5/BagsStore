import { Router } from "express";
import { body, param, query } from "express-validator";
import rateLimit from "express-rate-limit";
import { contactController } from "../controllers/contact.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

// ─────────────────────────────────────────────
// RATE LIMITER — contact form submission
// Strict: 3 submissions per hour per IP.
// Prevents spam while allowing genuine users
// to follow up on the same day.
// ─────────────────────────────────────────────
const contactSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many messages submitted from this IP. Please try again after an hour or reach us on WhatsApp.",
  },
});

// ─────────────────────────────────────────────
// INLINE VALIDATORS
// ─────────────────────────────────────────────
const validateContactSubmit = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email address is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^(\+92|0)[0-9]{10}$/)
    .withMessage(
      "Please provide a valid Pakistani phone number (e.g. 03001234567)."
    ),

  body("subject")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage("Subject cannot exceed 150 characters."),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required.")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Message must be between 10 and 2000 characters."),
];

const validateContactIdParam = [
  param("contactId")
    .isMongoId()
    .withMessage("Invalid contactId. Must be a valid ID."),
];

const validateAdminContactQuery = [
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
  query("isRead")
    .optional()
    .isBoolean()
    .withMessage("isRead must be true or false."),
];

// ─────────────────────────────────────────────
// PUBLIC ROUTE
// ─────────────────────────────────────────────

/**
 * POST /api/v1/contact
 * Submit a contact form message.
 * Works for guests and authenticated users.
 * optionalAuth links submission to user account if logged in.
 * Triggers customer acknowledgement + admin notification emails.
 *
 * Body: { name, email, phone?, subject?, message }
 */
router.post(
  "/",
  contactSubmitLimiter,
  optionalAuth,
  validateContactSubmit,
  validate,
  contactController.submitContact
);

// ─────────────────────────────────────────────
// ADMIN ROUTES
// All admin routes defined before /:contactId
// to prevent "admin" matching as a Mongo ObjectId.
// ─────────────────────────────────────────────

/**
 * GET /api/v1/contact/admin/all
 * Admin: paginated list of all contact messages.
 * Query params: page, limit, isRead
 */
router.get(
  "/admin/all",
  verifyToken,
  requireAdmin,
  validateAdminContactQuery,
  validate,
  contactController.getAllContacts
);

/**
 * GET /api/v1/contact/admin/unread-count
 * Admin: count of unread messages for sidebar badge.
 */
router.get(
  "/admin/unread-count",
  verifyToken,
  requireAdmin,
  contactController.getUnreadCount
);

/**
 * GET /api/v1/contact/admin/:contactId
 * Admin: get a single contact message by ID.
 * Auto-marks the message as read on open.
 */
router.get(
  "/admin/:contactId",
  verifyToken,
  requireAdmin,
  validateContactIdParam,
  validate,
  contactController.getContactById
);

/**
 * PUT /api/v1/contact/admin/:contactId/read
 * Admin: explicitly mark a message as read.
 */
router.put(
  "/admin/:contactId/read",
  verifyToken,
  requireAdmin,
  validateContactIdParam,
  validate,
  contactController.markAsRead
);

/**
 * PUT /api/v1/contact/admin/:contactId/unread
 * Admin: mark a message as unread for follow-up workflow.
 */
router.put(
  "/admin/:contactId/unread",
  verifyToken,
  requireAdmin,
  validateContactIdParam,
  validate,
  contactController.markAsUnread
);

/**
 * DELETE /api/v1/contact/admin/:contactId
 * Admin: permanently delete a contact message.
 */
router.delete(
  "/admin/:contactId",
  verifyToken,
  requireAdmin,
  validateContactIdParam,
  validate,
  contactController.deleteContact
);

export default router;