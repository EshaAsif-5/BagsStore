import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────────
// ROLE MIDDLEWARE
// Always used AFTER verifyToken — req.user is guaranteed to exist.
// ─────────────────────────────────────────────

/**
 * Restrict route to admin users only.
 *
 * Usage:
 *   router.get("/admin/orders", verifyToken, requireAdmin, controller)
 */
export const requireAdmin = (req, _res, next) => {
  if (!req.user) {
    return next(
      new ApiError(401, "Authentication required.")
    );
  }

  if (req.user.role !== "admin") {
    return next(
      new ApiError(
        403,
        "Access denied. Admin privileges are required for this action."
      )
    );
  }

  next();
};

/**
 * Restrict route to either the resource owner or an admin.
 * Extracts the target user ID from req.params[paramName] (default: "userId").
 *
 * Usage:
 *   router.get("/users/:userId/orders", verifyToken, requireOwnerOrAdmin(), controller)
 *   router.get("/orders/:id", verifyToken, requireOwnerOrAdmin("id"), controller)
 *   (second form compares req.params.id against the order's user field — handle in service)
 */
export const requireOwnerOrAdmin = (paramName = "userId") => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      req.params[paramName] &&
      req.user._id.toString() === req.params[paramName].toString();

    if (!isAdmin && !isOwner) {
      return next(
        new ApiError(
          403,
          "Access denied. You do not have permission to access this resource."
        )
      );
    }

    next();
  };
};

/**
 * Restrict route to customer role only.
 * Prevents admins from placing orders or writing reviews under customer flows.
 *
 * Usage:
 *   router.post("/reviews", verifyToken, requireCustomer, controller)
 */
export const requireCustomer = (req, _res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required."));
  }

  if (req.user.role !== "customer") {
    return next(
      new ApiError(
        403,
        "This action is only available to customer accounts."
      )
    );
  }

  next();
};

/**
 * Restrict route to authenticated users of any role.
 * Useful as a semantic alias to verifyToken in route files for clarity.
 *
 * Usage:
 *   router.get("/wishlist", verifyToken, requireAuth, controller)
 */
export const requireAuth = (req, _res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required."));
  }
  next();
};