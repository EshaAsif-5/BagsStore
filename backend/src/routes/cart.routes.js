import { Router } from "express";
import { cartController } from "../controllers/cart.controller.js";
import { optionalAuth, verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// ─────────────────────────────────────────────
// GUEST + AUTHENTICATED ROUTES
// optionalAuth — attaches req.user if token present,
// proceeds as guest if not. Cart service resolves
// which cart to use based on userId vs sessionId.
// ─────────────────────────────────────────────

/**
 * GET  /api/v1/cart   — fetch cart
 * DELETE /api/v1/cart — clear all items
 */
router
  .route("/")
  .get(optionalAuth, cartController.getCart)
  .delete(optionalAuth, cartController.clearCart);

/**
 * POST /api/v1/cart/items
 * Add a product variant to the cart.
 * Body: { productId, variantId, quantity? }
 */
router.post("/items", optionalAuth, cartController.addItem);

/**
 * PUT    /api/v1/cart/items/:itemId  — update quantity
 * DELETE /api/v1/cart/items/:itemId  — remove single item
 */
router
  .route("/items/:itemId")
  .put(optionalAuth, cartController.updateItem)
  .delete(optionalAuth, cartController.removeItem);

// ─────────────────────────────────────────────
// AUTHENTICATED-ONLY ROUTE
// verifyToken — user must be logged in to merge.
// Called by frontend immediately after login.
// ─────────────────────────────────────────────

/**
 * POST /api/v1/cart/merge
 * Merge guest cart (from guestSessionId cookie) into
 * the authenticated user's cart after login.
 */
router.post("/merge", verifyToken, cartController.mergeCart);

export default router;