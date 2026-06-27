import { Router } from "express";
import authRoutes from "./auth.routes.js";
import cartRoutes from "./cart.routes.js";
import wishlistRoutes from "./wishlist.routes.js";
import orderRoutes from "./order.routes.js";
import reviewRoutes from "./review.routes.js";
import contactRoutes from "./contact.routes.js";
import productRoutes from "./product.routes.js";

const router = Router();

// ─────────────────────────────────────────────
// API ROUTE AGGREGATOR
// Mounted in app.js at /api/v1
// ─────────────────────────────────────────────

router.use("/auth", authRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/orders", orderRoutes);
router.use("/reviews", reviewRoutes);
router.use("/contact", contactRoutes);
router.use("/products", productRoutes);

export default router;
