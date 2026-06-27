import Order from "../models/Order.model.js";

// ─────────────────────────────────────────────
// ORDER REPOSITORY
// Pure database access layer — no business logic.
// ─────────────────────────────────────────────

/**
 * Create and persist a new order document.
 */
const createOrder = async (orderData) => {
  const order = new Order(orderData);
  await order.save();
  return order;
};

/**
 * Find an order by its MongoDB ObjectId.
 * Populates product references for item display.
 */
const findById = (orderId) => {
  return Order.findById(orderId)
    .populate("items.product", "name slug images category")
    .populate("user", "name email phone");
};

/**
 * Find an order by ID without population — for internal mutations.
 */
const findByIdRaw = (orderId) => {
  return Order.findById(orderId);
};

/**
 * Find an order by orderNumber (human-readable, e.g. ZEE-2024-00001).
 * Used in admin searches and public order tracking.
 */
const findByOrderNumber = (orderNumber) => {
  return Order.findOne({ orderNumber })
    .populate("items.product", "name slug images category")
    .populate("user", "name email phone");
};

/**
 * Public order tracking — matches orderNumber AND shipping phone.
 * Returns limited fields to protect customer privacy.
 */
const findForTracking = (orderNumber, phone) => {
  return Order.findOne({
    orderNumber,
    "shippingAddress.phone": phone,
  }).select(
    "orderNumber status statusHistory shippingAddress.city shippingAddress.province " +
    "trackingNumber pricing payment.method items.name items.variant.color " +
    "items.variant.size items.quantity items.subtotal createdAt deliveredAt"
  );
};

/**
 * Get all orders for an authenticated customer.
 * Paginated, sorted newest first.
 */
const findByUserId = async (userId, { page = 1, limit = 10, status } = {}) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const filter = { user: userId };
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select(
        "orderNumber status payment.method pricing createdAt items.name " +
        "items.variant.color items.variant.size items.quantity items.image"
      ),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    hasNextPage: pageNum < Math.ceil(total / limitNum),
    hasPrevPage: pageNum > 1,
  };
};

/**
 * Admin: get all orders with filters and pagination.
 */
const findAllAdmin = async ({
  page = 1,
  limit = 20,
  status,
  paymentMethod,
  sortBy = "newest",
} = {}) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (status) filter.status = status;
  if (paymentMethod) filter["payment.method"] = paymentMethod;

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    "total-asc": { "pricing.total": 1 },
    "total-desc": { "pricing.total": -1 },
  };
  const sort = sortMap[sortBy] || { createdAt: -1 };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate("user", "name email phone")
      .select(
        "orderNumber status payment pricing shippingAddress.fullName " +
        "shippingAddress.phone shippingAddress.city createdAt items user guestInfo"
      ),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * Save a mutated order document.
 */
const saveOrder = (order) => {
  return order.save();
};

/**
 * Update specific fields on an order — for admin status updates.
 */
const updateOrder = (orderId, updates) => {
  return Order.findByIdAndUpdate(orderId, updates, {
    new: true,
    runValidators: true,
  }).populate("items.product", "name slug images");
};

/**
 * Get order counts grouped by status — for admin dashboard summary.
 */
const getStatusCounts = () => {
  return Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalRevenue: { $sum: "$pricing.total" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

/**
 * Check if a user has a delivered order containing a specific product.
 * Used to gate review submissions to verified purchasers only.
 */
const hasDeliveredOrderWithProduct = async (userId, productId) => {
  const order = await Order.findOne({
    user: userId,
    status: "delivered",
    "items.product": productId,
  });
  return Boolean(order);
};

/**
 * Get the order ID for a delivered order by a user containing a product.
 * Used when submitting a review to attach the order reference.
 */
const findDeliveredOrderWithProduct = (userId, productId) => {
  return Order.findOne({
    user: userId,
    status: "delivered",
    "items.product": productId,
  }).select("_id orderNumber");
};

export const orderRepository = {
  createOrder,
  findById,
  findByIdRaw,
  findByOrderNumber,
  findForTracking,
  findByUserId,
  findAllAdmin,
  saveOrder,
  updateOrder,
  getStatusCounts,
  hasDeliveredOrderWithProduct,
  findDeliveredOrderWithProduct,
};