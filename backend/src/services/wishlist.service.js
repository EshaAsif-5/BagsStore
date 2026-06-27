import { userRepository } from "../repositories/user.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────────
// WISHLIST SERVICE
// Wishlist is stored as an array of Product ObjectIds
// on the User document. Requires authentication.
// ─────────────────────────────────────────────

/**
 * Get the authenticated user's wishlist with populated product details.
 * Filters out any products that have since been deactivated.
 */
const getWishlist = async (userId) => {
  const result = await userRepository.getWishlist(userId);
  if (!result) {
    throw new ApiError(404, "User not found.");
  }

  // Filter out deactivated products from wishlist display
  const activeWishlist = (result.wishlist || []).filter(
    (product) => product && product.isActive !== false
  );

  return {
    wishlist: activeWishlist,
    count: activeWishlist.length,
  };
};

/**
 * Add a product to the wishlist.
 * Uses $addToSet — silently ignores if already present.
 * Validates that the product exists and is active before adding.
 */
const addToWishlist = async (userId, productId) => {
  // Validate product exists and is active
  const product = await productRepository.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found or is no longer available.");
  }

  const user = await userRepository.addToWishlist(userId, productId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return {
    wishlist: user.wishlist,
    count: user.wishlist.length,
    added: true,
  };
};

/**
 * Remove a product from the wishlist.
 * Silently succeeds even if product wasn't in wishlist.
 */
const removeFromWishlist = async (userId, productId) => {
  const user = await userRepository.removeFromWishlist(userId, productId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return {
    wishlist: user.wishlist,
    count: user.wishlist.length,
    removed: true,
  };
};

/**
 * Toggle a product in/out of the wishlist.
 * Returns the new state (added or removed).
 */
const toggleWishlist = async (userId, productId) => {
  const result = await userRepository.getWishlist(userId);
  if (!result) {
    throw new ApiError(404, "User not found.");
  }

  const isInWishlist = result.wishlist.some(
    (p) => p._id?.toString() === productId || p.toString() === productId
  );

  if (isInWishlist) {
    const data = await removeFromWishlist(userId, productId);
    return { ...data, action: "removed" };
  } else {
    const data = await addToWishlist(userId, productId);
    return { ...data, action: "added" };
  }
};

export const wishlistService = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
};