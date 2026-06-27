import { Router } from "express";
import { wishlistController } from "../controllers/wishlist.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { param } from "express-validator";

const router = Router();

// ─────────────────────────────────────────────
// ALL WISHLIST ROUTES ARE PROTECTED
// Wishlist is tied to the authenticated user's
// document — guests cannot have a wishlist.
// ─────────────────────────────────────────────

// Reusable productId param validator
const validateProductId = [
  param("productId")
    .isMongoId()
    .withMessage("Invalid productId. Must be a valid MongoDB ObjectId."),
];

/**
 * GET /api/v1/wishlist
 * Get the user's wishlist with populated product details.
 */
router.get("/", verifyToken, wishlistController.getWishlist);

/**
 * POST   /api/v1/wishlist/:productId  — add to wishlist
 * DELETE /api/v1/wishlist/:productId  — remove from wishlist
 */
router
  .route("/:productId")
  .post(
    verifyToken,
    validateProductId,
    validate,
    wishlistController.addToWishlist
  )
  .delete(
    verifyToken,
    validateProductId,
    validate,
    wishlistController.removeFromWishlist
  );

/**
 * POST /api/v1/wishlist/:productId/toggle
 * Toggle a product in/out of the wishlist.
 * Returns action: "added" | "removed" for UI state sync.
 */
router.post(
  "/:productId/toggle",
  verifyToken,
  validateProductId,
  validate,
  wishlistController.toggleWishlist
);

export default router;