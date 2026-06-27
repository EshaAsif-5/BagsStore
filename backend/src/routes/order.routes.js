import { Router } from "express";
import { orderController } from "../controllers/order.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import rateLimit from "express-rate-limit";
import {
  validatePlaceOrder,
  validateUpdateStatus,
  validateCancelOrder,
  validateTrackOrder,
  validateAdminOrderQuery,
  validateObjectIdParam,
} from "../validators/order.validators.js";

const router = Router();

// ─────────────────────────────────────────────
// RATE LIMITERS
// ─────────────────────────────────────────────

// Strict limit on order placement — prevents abuse / flooding
const orderPlacementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                    // 10 orders per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many orders placed. Please try again later.",
  },
});

// Tracking is public but should be rate-limited
const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // 20 tracking lookups per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many tracking requests. Please try again later.",
  },
});

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

/**
 * GET /api/v1/orders/track
 * Public order tracking by orderNumber + phone.
 * Must be defined BEFORE /:id to avoid route conflict.
 */
router.get(
  "/track",
  trackingLimiter,
  validateTrackOrder,
  validate,
  orderController.trackOrder
);

// ─────────────────────────────────────────────
// ADMIN-ONLY ROUTES
// Must be defined BEFORE /:id to avoid
// "admin" being treated as a Mongo ObjectId.
// ─────────────────────────────────────────────

/**
 * GET /api/v1/orders/admin/all
 * Admin: paginated order list with filters.
 */
router.get(
  "/admin/all",
  verifyToken,
  requireAdmin,
  validateAdminOrderQuery,
  validate,
  orderController.getAllOrdersAdmin
);

/**
 * GET /api/v1/orders/admin/summary
 * Admin: order counts and revenue grouped by status.
 */
router.get(
  "/admin/summary",
  verifyToken,
  requireAdmin,
  orderController.getOrderSummary
);

/**
 * PUT /api/v1/orders/admin/:id/status
 * Admin: update order status with state machine enforcement.
 * Body: { status, note?, trackingNumber? }
 */
router.put(
  "/admin/:id/status",
  verifyToken,
  requireAdmin,
  validateObjectIdParam("id"),
  validateUpdateStatus,
  validate,
  orderController.updateOrderStatus
);

// ─────────────────────────────────────────────
// CUSTOMER AUTHENTICATED ROUTES
// ─────────────────────────────────────────────

/**
 * GET /api/v1/orders/my
 * Authenticated customer's order history.
 * Query params: page, limit, status
 */
router.get(
  "/my",
  verifyToken,
  orderController.getMyOrders
);

// ─────────────────────────────────────────────
// ORDER PLACEMENT
// optionalAuth — supports both guest and authenticated users.
// ─────────────────────────────────────────────

/**
 * POST /api/v1/orders
 * Place a new order.
 * Rate limited to prevent abuse.
 */
router.post(
  "/",
  orderPlacementLimiter,
  optionalAuth,
  validatePlaceOrder,
  validate,
  orderController.placeOrder
);

// ─────────────────────────────────────────────
// SINGLE ORDER ROUTES (by MongoDB ObjectId)
// ─────────────────────────────────────────────

/**
 * GET /api/v1/orders/:id
 * Get full order details.
 * Customers can only see their own — admin can see any.
 */
router.get(
  "/:id",
  verifyToken,
  validateObjectIdParam("id"),
  validate,
  orderController.getOrderById
);

/**
 * POST /api/v1/orders/:id/cancel
 * Customer: cancel a pending or confirmed order.
 * Body: { reason? }
 */
router.post(
  "/:id/cancel",
  verifyToken,
  validateObjectIdParam("id"),
  validateCancelOrder,
  validate,
  orderController.cancelOrder
);

export default router;