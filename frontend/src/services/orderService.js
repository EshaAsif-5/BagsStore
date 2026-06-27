import api from "./api.js";

// ─────────────────────────────────────────────
// ORDER SERVICE
// All order-related API calls.
// Supports guest and authenticated order placement.
// ─────────────────────────────────────────────

/**
 * Place a new order.
 * Works for both guests and authenticated users.
 *
 * @param {Object} payload
 * @param {Array}  payload.items            — [{ productId, variantId, quantity }]
 * @param {Object} payload.shippingAddress  — { fullName, phone, street, city, province, postalCode? }
 * @param {string} payload.paymentMethod    — "cod" | "bank_transfer" | "easypaisa" | "jazzcash" | "card"
 * @param {string} [payload.paymentTransactionId] — for wallet/bank payments
 * @param {string} [payload.paymentProof]   — Cloudinary URL for transfer screenshot
 * @param {string} [payload.guestName]      — required if not authenticated
 * @param {string} [payload.guestEmail]     — optional for guest
 * @param {string} [payload.guestPhone]     — required if not authenticated
 * @param {string} [payload.notes]          — delivery instructions
 */
const placeOrder = async (payload) => {
  const { data } = await api.post("/orders", payload);
  return data.data;
};

/**
 * Get the authenticated customer's order history.
 * @param {{ page?, limit?, status? }} params
 */
const getMyOrders = async (params = {}) => {
  const { data } = await api.get("/orders/my", { params });
  return data.data;
};

/**
 * Get full details of a specific order.
 * Customers can only access their own orders.
 * @param {string} orderId
 */
const getOrderById = async (orderId) => {
  const { data } = await api.get(`/orders/${orderId}`);
  return data.data.order;
};

/**
 * Public order tracking — no authentication required.
 * @param {{ orderNumber, phone }} params
 */
const trackOrder = async ({ orderNumber, phone }) => {
  const { data } = await api.get("/orders/track", {
    params: { orderNumber, phone },
  });
  return data.data.tracking;
};

/**
 * Customer: cancel a pending or confirmed order.
 * @param {string} orderId
 * @param {string} [reason] — optional cancellation reason
 */
const cancelOrder = async (orderId, reason) => {
  const { data } = await api.post(`/orders/${orderId}/cancel`, {
    reason: reason || "",
  });
  return data.data.order;
};

// ── Admin ─────────────────────────────────────

/**
 * Admin: get all orders with filters and pagination.
 * @param {{ page?, limit?, status?, paymentMethod?, sortBy? }} params
 */
const getAllOrdersAdmin = async (params = {}) => {
  const { data } = await api.get("/orders/admin/all", { params });
  return data.data;
};

/**
 * Admin: get order status counts and total revenue.
 * Used for the admin dashboard summary panel.
 */
const getOrderSummary = async () => {
  const { data } = await api.get("/orders/admin/summary");
  return data.data.summary;
};

/**
 * Admin: update the status of an order.
 * Enforces state machine transitions on the server.
 *
 * @param {string} orderId
 * @param {{ status, note?, trackingNumber? }} payload
 */
const updateOrderStatus = async (orderId, payload) => {
  const { data } = await api.put(`/orders/admin/${orderId}/status`, payload);
  return data.data.order;
};

const orderService = {
  placeOrder,
  getMyOrders,
  getOrderById,
  trackOrder,
  cancelOrder,
  getAllOrdersAdmin,
  getOrderSummary,
  updateOrderStatus,
};

export default orderService;