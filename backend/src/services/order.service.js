import { orderRepository } from "../repositories/order.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { cartRepository } from "../repositories/cart.repository.js";
import ApiError from "../utils/ApiError.js";
import generateOrderNumber from "../utils/generateOrderNumber.js";

// ─────────────────────────────────────────────
// SHIPPING FEE RULES
// Pakistan-only delivery.
// Adjust thresholds and fees as business evolves.
// ─────────────────────────────────────────────
const SHIPPING_FEE_STANDARD = 200;   // PKR — standard delivery
const SHIPPING_FEE_FREE_THRESHOLD = 5000; // PKR — free shipping above this subtotal

const calculateShippingFee = (subtotal) => {
  return subtotal >= SHIPPING_FEE_FREE_THRESHOLD ? 0 : SHIPPING_FEE_STANDARD;
};

// ─────────────────────────────────────────────
// PAYMENT METHOD LABELS (for display/emails)
// ─────────────────────────────────────────────
const PAYMENT_LABELS = {
  cod: "Cash on Delivery",
  bank_transfer: "Bank Transfer",
  easypaisa: "EasyPaisa",
  jazzcash: "JazzCash",
  card: "Debit / Credit Card",
};

// ─────────────────────────────────────────────
// STATUS TRANSITION RULES
// Defines which transitions are legal.
// Prevents e.g. a delivered order being set back to pending.
// ─────────────────────────────────────────────
const VALID_TRANSITIONS = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped:    ["delivered"],
  delivered:  [], // Terminal state — no further transitions
  cancelled:  [], // Terminal state — no further transitions
};

const isValidTransition = (currentStatus, newStatus) => {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
};

// ─────────────────────────────────────────────
// ORDER SERVICE
// ─────────────────────────────────────────────

/**
 * Validate all order items against current product/variant data.
 * Returns enriched item snapshots for storage.
 * Throws if any item is invalid, out of stock, or unavailable.
 *
 * @param {Array} items - [{ productId, variantId, quantity }]
 * @returns {Object} { enrichedItems, subtotal }
 */
const validateAndEnrichItems = async (items) => {
  const enrichedItems = [];
  let subtotal = 0;

  for (let i = 0; i < items.length; i++) {
    const { productId, variantId, quantity } = items[i];

    // Fetch the product
    const product = await productRepository.findById(productId);
    if (!product || !product.isActive) {
      throw new ApiError(
        400,
        `Item ${i + 1}: Product is no longer available.`
      );
    }

    // Resolve the variant
    const variant = product.variants.id(variantId);
    if (!variant) {
      throw new ApiError(
        400,
        `Item ${i + 1}: Selected variant (color/size) no longer exists for "${product.name}".`
      );
    }

    // Check stock
    if (variant.stock < quantity) {
      throw new ApiError(
        400,
        variant.stock === 0
          ? `"${product.name}" (${variant.color}, ${variant.size}) is out of stock.`
          : `Only ${variant.stock} unit(s) of "${product.name}" (${variant.color}, ${variant.size}) are available.`
      );
    }

    const itemSubtotal = variant.price * quantity;
    subtotal += itemSubtotal;

    // Build price/product snapshot for immutable order record
    enrichedItems.push({
      product: product._id,
      name: product.name,
      image:
        product.images?.find((img) => img.isPrimary)?.url ||
        product.images?.[0]?.url ||
        "",
      variant: {
        variantId: variant._id,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        sku: variant.sku || "",
      },
      quantity,
      subtotal: itemSubtotal,
    });
  }

  return { enrichedItems, subtotal };
};

/**
 * Decrement stock for all order items atomically.
 * Rolls back on partial failure to prevent overselling.
 */
const decrementStockForItems = async (items) => {
  const decremented = [];

  try {
    for (const item of items) {
      const updated = await productRepository.decrementVariantStock(
        item.product,
        item.variant.variantId,
        item.quantity
      );

      if (!updated) {
        // Stock ran out between validation and decrement (race condition)
        throw new ApiError(
          409,
          `Stock for "${item.name}" (${item.variant.color}, ${item.variant.size}) was exhausted by another order. Please try again.`
        );
      }

      decremented.push({
        productId: item.product,
        variantId: item.variant.variantId,
        quantity: item.quantity,
      });
    }
  } catch (err) {
    // Roll back all successfully decremented items
    for (const d of decremented) {
      await productRepository.incrementVariantStock(
        d.productId,
        d.variantId,
        d.quantity
      ).catch(() => {
        // Log rollback failure — requires manual correction
        console.error(
          `[CRITICAL] Stock rollback failed for product ${d.productId} variant ${d.variantId}. Manual correction required.`
        );
      });
    }
    throw err;
  }
};

/**
 * Restore stock for all items in a cancelled order.
 */
const restoreStockForItems = async (items) => {
  for (const item of items) {
    await productRepository.incrementVariantStock(
      item.product,
      item.variant.variantId,
      item.quantity
    ).catch((err) => {
      console.error(
        `[CRITICAL] Stock restore failed for product ${item.product} on cancellation. Err: ${err.message}`
      );
    });
  }
};

// ─────────────────────────────────────────────
// PUBLIC SERVICE METHODS
// ─────────────────────────────────────────────

/**
 * Place a new order.
 * Supports authenticated users and guests.
 * Handles all 5 payment methods with appropriate initial states.
 *
 * Payment flow per method:
 *   cod           → payment.status: "pending" (paid on delivery)
 *   bank_transfer → payment.status: "pending" (await proof)
 *   easypaisa     → payment.status: "pending" (await transaction ID)
 *   jazzcash      → payment.status: "pending" (await transaction ID)
 *   card          → payment.status: "pending" (gateway placeholder)
 */
const placeOrder = async ({
  userId,          // null for guest
  guestInfo,       // { name, email, phone } for guest
  items,
  shippingAddress,
  paymentMethod,
  paymentTransactionId,
  paymentProof,
  notes,
}) => {
  // 1. Require guest info if not authenticated
  if (!userId && (!guestInfo?.name || !guestInfo?.phone)) {
    throw new ApiError(
      400,
      "Name and phone number are required for guest checkout."
    );
  }

  // 2. Validate all items and compute totals from live DB prices
  const { enrichedItems, subtotal } = await validateAndEnrichItems(items);

  const shippingFee = calculateShippingFee(subtotal);
  const total = subtotal + shippingFee;

  // 3. Determine initial payment status
  //    COD: cash collected on delivery — stays pending until delivered
  //    Transfers/wallets: pending until admin confirms receipt
  //    Card: pending until payment gateway integration is wired
  const paymentStatus =
    paymentMethod === "cod" ? "pending" : "pending";

  // 4. Generate order number
  const orderNumber = await generateOrderNumber();

  // 5. Build the order document
  const orderData = {
    orderNumber,
    user: userId || null,
    guestInfo: userId ? undefined : guestInfo,
    items: enrichedItems,
    shippingAddress,
    payment: {
      method: paymentMethod,
      status: paymentStatus,
      transactionId: paymentTransactionId || null,
      paymentProof: paymentProof || null,
    },
    pricing: {
      subtotal,
      shippingFee,
      total,
    },
    status: "pending",
    notes: notes || "",
    statusHistory: [
      {
        status: "pending",
        note: `Order placed via ${PAYMENT_LABELS[paymentMethod]}.`,
        timestamp: new Date(),
      },
    ],
  };

  // 6. Decrement stock — with rollback on failure
  await decrementStockForItems(enrichedItems);

  // 7. Persist the order
  let order;
  try {
    order = await orderRepository.createOrder(orderData);
  } catch (err) {
    // Order creation failed — restore decremented stock
    await restoreStockForItems(enrichedItems);
    throw new ApiError(500, "Order could not be saved. Please try again.");
  }

  // 8. Clear the user's server-side cart after successful order
  if (userId) {
    const cart = await cartRepository.findByUserIdRaw(userId);
    if (cart) {
      cart.items = [];
      await cart.save().catch(() => {
        // Non-critical — cart will be stale but order is saved
        console.warn(`[WARN] Could not clear cart for user ${userId} after order ${orderNumber}.`);
      });
    }
  }

  return order;
};

/**
 * Get order details for the owner (customer) or admin.
 * Throws 403 if a customer tries to access another user's order.
 */
const getOrderById = async (orderId, requestingUserId, requestingRole) => {
  const order = await orderRepository.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  // Enforce ownership — customers can only see their own orders
  if (requestingRole !== "admin") {
    const orderOwner = order.user?._id?.toString() || order.user?.toString();
    if (!orderOwner || orderOwner !== requestingUserId.toString()) {
      throw new ApiError(
        403,
        "You do not have permission to view this order."
      );
    }
  }

  return order;
};

/**
 * Get paginated order history for an authenticated customer.
 */
const getMyOrders = async (userId, queryParams) => {
  return orderRepository.findByUserId(userId, queryParams);
};

/**
 * Public order tracking — no authentication required.
 * Customer provides orderNumber + phone used at checkout.
 */
const trackOrder = async (orderNumber, phone) => {
  const order = await orderRepository.findForTracking(orderNumber, phone);

  if (!order) {
    throw new ApiError(
      404,
      "No order found with this order number and phone combination. Please check your details."
    );
  }

  // Build a clean tracking response — no sensitive payment data
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    statusHistory: order.statusHistory,
    trackingNumber: order.trackingNumber,
    paymentMethod: order.payment?.method,
    shippingTo: {
      city: order.shippingAddress?.city,
      province: order.shippingAddress?.province,
    },
    items: order.items,
    pricing: order.pricing,
    placedAt: order.createdAt,
    deliveredAt: order.deliveredAt,
  };
};

/**
 * Customer: cancel their own order.
 * Only allowed for orders in "pending" or "confirmed" status.
 * Restores stock on cancellation.
 */
const cancelOrder = async (orderId, userId, cancellationReason) => {
  const order = await orderRepository.findByIdRaw(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  // Ownership check
  const orderOwner = order.user?.toString();
  if (orderOwner !== userId.toString()) {
    throw new ApiError(403, "You do not have permission to cancel this order.");
  }

  // Cancellable status check
  if (!order.canBeCancelled) {
    throw new ApiError(
      400,
      `This order cannot be cancelled. Orders in "${order.status}" status are no longer eligible for cancellation.`
    );
  }

  // Update status and add history entry
  order.addStatusHistory(
    "cancelled",
    cancellationReason || "Cancelled by customer.",
    userId
  );
  order.cancellationReason = cancellationReason || null;

  await orderRepository.saveOrder(order);

  // Restore inventory
  await restoreStockForItems(order.items);

  return order;
};

/**
 * Admin: update order status with transition validation.
 * Also handles tracking number updates when marking as shipped.
 */
const updateOrderStatus = async (
  orderId,
  { status, note, trackingNumber },
  adminId
) => {
  const order = await orderRepository.findByIdRaw(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  // Enforce valid state machine transitions
  if (!isValidTransition(order.status, status)) {
    throw new ApiError(
      400,
      `Cannot transition order from "${order.status}" to "${status}". ` +
      `Allowed next statuses: ${VALID_TRANSITIONS[order.status]?.join(", ") || "none"}.`
    );
  }

  // Attach tracking number when shipping
  if (status === "shipped" && trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

  // Mark payment as paid when delivering a COD order
  if (status === "delivered" && order.payment.method === "cod") {
    order.payment.status = "paid";
    order.payment.paidAt = new Date();
  }

  // Update status history via model instance method
  order.addStatusHistory(
    status,
    note || `Status updated to "${status}" by admin.`,
    adminId
  );

  if (status === "cancelled") {
    order.cancellationReason = note || "Cancelled by admin.";
    await restoreStockForItems(order.items);
  }

  await orderRepository.saveOrder(order);

  // Return fully populated order for the admin response
  return orderRepository.findById(orderId);
};

/**
 * Admin: get all orders with filters and pagination.
 */
const getAllOrdersAdmin = async (queryParams) => {
  return orderRepository.findAllAdmin(queryParams);
};

/**
 * Admin: get order status counts for dashboard summary.
 */
const getOrderStatusCounts = async () => {
  const counts = await orderRepository.getStatusCounts();

  // Fill in zero-counts for statuses with no orders
  const allStatuses = [
    "pending", "confirmed", "processing", "shipped", "delivered", "cancelled",
  ];

  const result = allStatuses.reduce((acc, status) => {
    const found = counts.find((c) => c._id === status);
    acc[status] = {
      count: found?.count || 0,
      totalRevenue: found?.totalRevenue || 0,
    };
    return acc;
  }, {});

  const totalRevenue = counts
    .filter((c) => c._id === "delivered")
    .reduce((sum, c) => sum + c.totalRevenue, 0);

  return { statusCounts: result, totalRevenue };
};

export const orderService = {
  placeOrder,
  getOrderById,
  getMyOrders,
  trackOrder,
  cancelOrder,
  updateOrderStatus,
  getAllOrdersAdmin,
  getOrderStatusCounts,
};