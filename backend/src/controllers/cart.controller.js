import { cartService } from "../services/cart.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─────────────────────────────────────────────
// SESSION HELPER
// Extracts the guest sessionId from cookie.
// Set by the client as a UUID on first page load.
// ─────────────────────────────────────────────
const getSessionId = (req) => req.cookies?.guestSessionId || null;

// ─────────────────────────────────────────────
// CART CONTROLLERS
// All endpoints support both authenticated users
// (identified by req.user from verifyToken) and
// guests (identified by guestSessionId cookie).
// ─────────────────────────────────────────────

/**
 * GET /api/v1/cart
 * Get the current cart with populated product + variant details.
 * Works for both authenticated users and guests.
 */
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const sessionId = getSessionId(req);

  const cart = await cartService.getCart(userId, sessionId);

  return res.status(200).json(
    new ApiResponse(200, { cart }, "Cart fetched successfully.")
  );
});

/**
 * POST /api/v1/cart/items
 * Add a product variant to the cart.
 * If the item already exists, increments its quantity.
 *
 * Body: { productId, variantId, quantity? }
 */
const addItem = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const sessionId = getSessionId(req);

  const { productId, variantId, quantity = 1 } = req.body;

  if (!productId || !variantId) {
    return res.status(400).json(
      new ApiResponse(400, null, "productId and variantId are required.")
    );
  }

  const parsedQty = Math.max(1, parseInt(quantity) || 1);

  const cart = await cartService.addItem(userId, sessionId, {
    productId,
    variantId,
    quantity: parsedQty,
  });

  return res.status(200).json(
    new ApiResponse(200, { cart }, "Item added to cart.")
  );
});

/**
 * PUT /api/v1/cart/items/:itemId
 * Update the quantity of a cart item.
 * Sending quantity=0 removes the item.
 *
 * Body: { quantity }
 */
const updateItem = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const sessionId = getSessionId(req);
  const { itemId } = req.params;

  const quantity = parseInt(req.body.quantity);
  if (isNaN(quantity) || quantity < 0) {
    return res.status(400).json(
      new ApiResponse(400, null, "Quantity must be a non-negative integer.")
    );
  }

  const cart = await cartService.updateItemQuantity(
    userId,
    sessionId,
    itemId,
    quantity
  );

  return res.status(200).json(
    new ApiResponse(200, { cart }, "Cart item updated.")
  );
});

/**
 * DELETE /api/v1/cart/items/:itemId
 * Remove a specific item from the cart by its item _id.
 */
const removeItem = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const sessionId = getSessionId(req);
  const { itemId } = req.params;

  const cart = await cartService.removeItem(userId, sessionId, itemId);

  return res.status(200).json(
    new ApiResponse(200, { cart }, "Item removed from cart.")
  );
});

/**
 * DELETE /api/v1/cart
 * Clear all items from the cart.
 */
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const sessionId = getSessionId(req);

  const cart = await cartService.clearCart(userId, sessionId);

  return res.status(200).json(
    new ApiResponse(200, { cart }, "Cart cleared.")
  );
});

/**
 * POST /api/v1/cart/merge
 * Merge a guest cart into the authenticated user's cart after login.
 * Called by the frontend immediately after a successful login
 * if a guestSessionId cookie is present.
 *
 * No body required — reads guestSessionId from cookie and user from JWT.
 */
const mergeCart = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Must be authenticated
  const sessionId = getSessionId(req);

  if (!sessionId) {
    return res.status(200).json(
      new ApiResponse(200, null, "No guest cart to merge.")
    );
  }

  await cartService.mergeGuestCart(userId, sessionId);

  // Fetch the merged cart to return to client
  const cart = await cartService.getCart(userId, null);

  // Clear the guest session cookie now that it's been merged
  res.clearCookie("guestSessionId", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });

  return res.status(200).json(
    new ApiResponse(200, { cart }, "Guest cart merged successfully.")
  );
});

export const cartController = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
};