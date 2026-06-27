import Cart from "../models/Cart.model.js";

// ─────────────────────────────────────────────
// CART REPOSITORY
// Pure database access layer — no business logic.
// Handles both authenticated user carts and guest
// carts identified by sessionId.
// ─────────────────────────────────────────────

/**
 * Find a cart by authenticated user ID.
 * Populates product details for each cart item.
 */
const findByUserId = (userId) => {
  return Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name slug images variants isActive category",
  });
};

/**
 * Find a guest cart by sessionId cookie.
 * Populates product details for each cart item.
 */
const findBySessionId = (sessionId) => {
  return Cart.findOne({ sessionId, user: null }).populate({
    path: "items.product",
    select: "name slug images variants isActive category",
  });
};

/**
 * Find a cart by user ID without populating.
 * Used for internal mutations where population is not needed.
 */
const findByUserIdRaw = (userId) => {
  return Cart.findOne({ user: userId });
};

/**
 * Find a guest cart by sessionId without populating.
 */
const findBySessionIdRaw = (sessionId) => {
  return Cart.findOne({ sessionId, user: null });
};

/**
 * Create a new empty cart for an authenticated user.
 */
const createForUser = async (userId) => {
  const cart = new Cart({ user: userId, items: [] });
  await cart.save();
  return cart;
};

/**
 * Create a new empty guest cart with a sessionId.
 */
const createForGuest = async (sessionId) => {
  const cart = new Cart({ sessionId, user: null, items: [] });
  await cart.save();
  return cart;
};

/**
 * Save a cart document — used after in-memory mutations
 * via Cart model instance methods.
 */
const saveCart = (cart) => {
  return cart.save();
};

/**
 * Get or create a cart for an authenticated user.
 * Returns the existing cart or a fresh empty one.
 */
const getOrCreateForUser = async (userId) => {
  let cart = await findByUserIdRaw(userId);
  if (!cart) {
    cart = await createForUser(userId);
  }
  return cart;
};

/**
 * Get or create a guest cart by sessionId.
 */
const getOrCreateForGuest = async (sessionId) => {
  let cart = await findBySessionIdRaw(sessionId);
  if (!cart) {
    cart = await createForGuest(sessionId);
  }
  return cart;
};

/**
 * Delete a guest cart after merging into a user cart on login.
 */
const deleteBySessionId = (sessionId) => {
  return Cart.findOneAndDelete({ sessionId, user: null });
};

/**
 * Clear all items from a cart without deleting the document.
 */
const clearItems = (cartId) => {
  return Cart.findByIdAndUpdate(
    cartId,
    { $set: { items: [] } },
    { new: true }
  );
};

/**
 * Hard-delete a cart document entirely.
 */
const deleteCart = (cartId) => {
  return Cart.findByIdAndDelete(cartId);
};

export const cartRepository = {
  findByUserId,
  findBySessionId,
  findByUserIdRaw,
  findBySessionIdRaw,
  createForUser,
  createForGuest,
  saveCart,
  getOrCreateForUser,
  getOrCreateForGuest,
  deleteBySessionId,
  clearItems,
  deleteCart,
};