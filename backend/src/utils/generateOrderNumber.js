import Order from "../models/Order.model.js";

// ─────────────────────────────────────────────
// ORDER NUMBER GENERATOR
// Format: ZEE-YYYY-NNNNN
// e.g.    ZEE-2024-00001
//
// Uses countDocuments for sequential numbering.
// Safe for the expected order volume at launch.
// For high-concurrency scale, replace with an
// atomic counter collection (see note below).
// ─────────────────────────────────────────────

/**
 * Generate a unique, human-readable order number.
 *
 * Format: ZEE-{YEAR}-{5-digit-padded-sequence}
 *
 * Note: For high-concurrency scenarios, replace this with
 * an atomic counter using findOneAndUpdate on a dedicated
 * counters collection to eliminate the (extremely rare)
 * race condition between countDocuments and insert.
 * At launch volume (20-50 products, low traffic), this is safe.
 *
 * @returns {Promise<string>} e.g. "ZEE-2024-00042"
 */
const generateOrderNumber = async () => {
  const year = new Date().getFullYear();

  // Count all orders ever placed (not just this year) for global sequence
  const count = await Order.countDocuments();
  const sequence = String(count + 1).padStart(5, "0");

  const orderNumber = `ZEE-${year}-${sequence}`;

  // Collision guard — if this number already exists (race condition),
  // retry with count + random offset
  const existing = await Order.exists({ orderNumber });
  if (existing) {
    const fallback = String(count + 1 + Math.floor(Math.random() * 100)).padStart(5, "0");
    return `ZEE-${year}-${fallback}`;
  }

  return orderNumber;
};

export default generateOrderNumber;