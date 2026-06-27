import { wishlistService } from "../services/wishlist.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─────────────────────────────────────────────
// WISHLIST CONTROLLERS
// All endpoints are protected — require authentication.
// Wishlist is tied to the User document, not a guest session.
// ─────────────────────────────────────────────

/**
 * GET /api/v1/wishlist
 * Get the authenticated user's full wishlist with populated product data.
 * Inactive/deleted products are automatically excluded.
 */
const getWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.getWishlist(req.user._id);

  return res.status(200).json(
    new ApiResponse(200, result, "Wishlist fetched successfully.")
  );
});

/**
 * POST /api/v1/wishlist/:productId
 * Add a product to the wishlist.
 * Idempotent — adding the same product twice has no effect.
 *
 * Params: productId (MongoDB ObjectId)
 */
const addToWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.addToWishlist(
    req.user._id,
    req.params.productId
  );

  return res.status(200).json(
    new ApiResponse(200, result, "Product added to wishlist.")
  );
});

/**
 * DELETE /api/v1/wishlist/:productId
 * Remove a product from the wishlist.
 * Idempotent — silently succeeds if product wasn't in wishlist.
 *
 * Params: productId (MongoDB ObjectId)
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.removeFromWishlist(
    req.user._id,
    req.params.productId
  );

  return res.status(200).json(
    new ApiResponse(200, result, "Product removed from wishlist.")
  );
});

/**
 * POST /api/v1/wishlist/:productId/toggle
 * Toggle a product in/out of the wishlist.
 * Returns { action: "added" | "removed" } so the frontend
 * can update the heart icon without a separate GET.
 *
 * Params: productId (MongoDB ObjectId)
 */
const toggleWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.toggleWishlist(
    req.user._id,
    req.params.productId
  );

  const message =
    result.action === "added"
      ? "Product added to wishlist."
      : "Product removed from wishlist.";

  return res.status(200).json(new ApiResponse(200, result, message));
});

export const wishlistController = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
};