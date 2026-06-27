import api from "./api.js";

// ─────────────────────────────────────────────
// WISHLIST SERVICE
// All wishlist API calls — requires authentication.
// State managed by wishlistStore.js.
// Guest wishlist is handled purely in localStorage
// via the store; no API calls for guests.
// ─────────────────────────────────────────────

/**
 * Get the authenticated user's wishlist.
 * Returns populated product objects.
 */
const getWishlist = async () => {
  const { data } = await api.get("/wishlist");
  return data.data;
};

/**
 * Add a product to the wishlist.
 * Idempotent — safe to call if already wishlisted.
 * @param {string} productId
 */
const addToWishlist = async (productId) => {
  const { data } = await api.post(`/wishlist/${productId}`);
  return data.data;
};

/**
 * Remove a product from the wishlist.
 * Idempotent — safe to call if not in wishlist.
 * @param {string} productId
 */
const removeFromWishlist = async (productId) => {
  const { data } = await api.delete(`/wishlist/${productId}`);
  return data.data;
};

/**
 * Toggle a product in/out of the wishlist.
 * Returns { action: "added" | "removed", wishlist, count }.
 * @param {string} productId
 */
const toggleWishlist = async (productId) => {
  const { data } = await api.post(`/wishlist/${productId}/toggle`);
  return data.data;
};

const wishlistService = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
};

export default wishlistService;