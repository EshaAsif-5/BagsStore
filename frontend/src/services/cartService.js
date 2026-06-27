import api from "./api.js";

// ─────────────────────────────────────────────
// CART SERVICE
// Pure API call functions — state is managed
// by cartStore.js. These are called from the
// store actions and can also be used directly
// in components via TanStack Query if needed.
// ─────────────────────────────────────────────

/**
 * Get the current cart.
 * Works for authenticated users (by cookie) and
 * guests (by x-guest-session-id header, injected
 * by the Axios request interceptor in api.js).
 */
const getCart = async () => {
  const { data } = await api.get("/cart");
  return data.data.cart;
};

/**
 * Add a product variant to the cart.
 * If the item exists, increments its quantity.
 *
 * @param {{ productId, variantId, quantity? }} payload
 */
const addItem = async ({ productId, variantId, quantity = 1 }) => {
  const { data } = await api.post("/cart/items", {
    productId,
    variantId,
    quantity,
  });
  return data.data.cart;
};

/**
 * Update the quantity of a cart item.
 * Sending quantity = 0 removes the item.
 *
 * @param {string} itemId   — cart item sub-document _id
 * @param {number} quantity
 */
const updateItem = async (itemId, quantity) => {
  const { data } = await api.put(`/cart/items/${itemId}`, { quantity });
  return data.data.cart;
};

/**
 * Remove a specific item from the cart.
 * @param {string} itemId
 */
const removeItem = async (itemId) => {
  const { data } = await api.delete(`/cart/items/${itemId}`);
  return data.data.cart;
};

/**
 * Clear all items from the cart.
 */
const clearCart = async () => {
  const { data } = await api.delete("/cart");
  return data.data.cart;
};

/**
 * Merge guest cart into the authenticated user's cart.
 * Called immediately after login if a guestSessionId exists.
 * The server reads the x-guest-session-id header (set by interceptor).
 */
const mergeCart = async () => {
  const { data } = await api.post("/cart/merge");
  return data.data.cart;
};

const cartService = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
};

export default cartService;