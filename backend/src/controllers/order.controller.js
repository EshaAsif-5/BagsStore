import { orderService } from "../services/order.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─────────────────────────────────────────────
// ORDER CONTROLLERS
// ─────────────────────────────────────────────

/**
 * POST /api/v1/orders
 * Place a new order.
 * Supports authenticated users and guests.
 *
 * Body:
 *   items[]            — [{ productId, variantId, quantity }]
 *   shippingAddress    — { fullName, phone, street, city, province, postalCode? }
 *   paymentMethod      — cod | bank_transfer | easypaisa | jazzcash | card
 *   paymentTransactionId? — for bank_transfer / easypaisa / jazzcash
 *   paymentProof?      — Cloudinary URL for transfer screenshot
 *   guestName?         — required if not authenticated
 *   guestEmail?        — optional for guest
 *   guestPhone?        — required if not authenticated
 *   notes?             — optional delivery instructions
 */
const placeOrder = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;

  const {
    items,
    shippingAddress,
    paymentMethod,
    paymentTransactionId,
    paymentProof,
    guestName,
    guestEmail,
    guestPhone,
    notes,
  } = req.body;

  // Build guest info only if not authenticated
  const guestInfo = !userId
    ? {
        name: guestName,
        email: guestEmail || null,
        phone: guestPhone,
      }
    : null;

  const order = await orderService.placeOrder({
    userId,
    guestInfo,
    items,
    shippingAddress,
    paymentMethod,
    paymentTransactionId,
    paymentProof,
    notes,
  });

  // Build payment instructions for the response
  const paymentInstructions = buildPaymentInstructions(
    paymentMethod,
    order.pricing.total
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          pricing: order.pricing,
          payment: {
            method: order.payment.method,
            status: order.payment.status,
          },
          shippingAddress: order.shippingAddress,
          items: order.items,
          createdAt: order.createdAt,
        },
        paymentInstructions,
      },
      "Order placed successfully! Thank you for shopping with ZEE.BY ZOHAIB."
    )
  );
});

/**
 * GET /api/v1/orders/my
 * Get the authenticated customer's order history.
 *
 * Query params: page, limit, status
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getMyOrders(req.user._id, req.query);

  return res.status(200).json(
    new ApiResponse(200, result, "Order history fetched successfully.")
  );
});

/**
 * GET /api/v1/orders/track
 * Public order tracking — no authentication required.
 *
 * Query params: orderNumber, phone
 */
const trackOrder = asyncHandler(async (req, res) => {
  const { orderNumber, phone } = req.query;

  const tracking = await orderService.trackOrder(orderNumber, phone);

  return res.status(200).json(
    new ApiResponse(200, { tracking }, "Order tracking information fetched.")
  );
});

/**
 * GET /api/v1/orders/:id
 * Get full order details.
 * Customers can only access their own orders.
 * Admins can access any order.
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(
    req.params.id,
    req.user._id,
    req.user.role
  );

  return res.status(200).json(
    new ApiResponse(200, { order }, "Order fetched successfully.")
  );
});

/**
 * POST /api/v1/orders/:id/cancel
 * Customer: cancel their own order.
 * Only orders in "pending" or "confirmed" status can be cancelled.
 *
 * Body: { reason? }
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.params.id,
    req.user._id,
    req.body.reason
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          cancellationReason: order.cancellationReason,
          cancelledAt: order.cancelledAt,
        },
      },
      "Order cancelled successfully. Your stock has been restored."
    )
  );
});

// ─────────────────────────────────────────────
// ADMIN CONTROLLERS
// ─────────────────────────────────────────────

/**
 * GET /api/v1/orders/admin/all
 * Admin: get all orders with filters and pagination.
 *
 * Query params: page, limit, status, paymentMethod, sortBy
 */
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const result = await orderService.getAllOrdersAdmin(req.query);

  return res.status(200).json(
    new ApiResponse(200, result, "Orders fetched successfully.")
  );
});

/**
 * GET /api/v1/orders/admin/summary
 * Admin: get order counts and total revenue by status.
 * Used for the admin dashboard overview.
 */
const getOrderSummary = asyncHandler(async (req, res) => {
  const summary = await orderService.getOrderStatusCounts();

  return res.status(200).json(
    new ApiResponse(200, { summary }, "Order summary fetched successfully.")
  );
});

/**
 * PUT /api/v1/orders/admin/:id/status
 * Admin: update order status with state-machine validation.
 *
 * Body: { status, note?, trackingNumber? }
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, trackingNumber } = req.body;

  const order = await orderService.updateOrderStatus(
    req.params.id,
    { status, note, trackingNumber },
    req.user._id
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { order },
      `Order status updated to "${status}" successfully.`
    )
  );
});

// ─────────────────────────────────────────────
// PAYMENT INSTRUCTIONS BUILDER
// Returns customer-facing payment instructions
// based on the selected payment method.
// ─────────────────────────────────────────────
const buildPaymentInstructions = (method, total) => {
  const formattedTotal = `PKR ${total.toLocaleString("en-PK")}`;

  const instructions = {
    cod: {
      title: "Cash on Delivery",
      message: `Please keep ${formattedTotal} ready at the time of delivery. Our rider will collect the payment when your order arrives.`,
      steps: [
        "Your order has been confirmed.",
        "We will contact you before dispatch.",
        `Prepare ${formattedTotal} in cash for the delivery rider.`,
      ],
    },
    bank_transfer: {
      title: "Bank Transfer",
      message: `Please transfer ${formattedTotal} to our bank account and share the transaction screenshot via WhatsApp.`,
      steps: [
        `Transfer ${formattedTotal} to: Bank: Meezan Bank | Account Title: ZEE BY ZOHAIB | Account Number: XXXX-XXXX-XXXX`,
        "Take a clear screenshot of the transaction receipt.",
        "Send the screenshot to our WhatsApp: +92-XXX-XXXXXXX",
        "Your order will be confirmed once payment is verified (within 2 hours).",
      ],
      bankDetails: {
        bankName: "Meezan Bank",
        accountTitle: "ZEE BY ZOHAIB",
        accountNumber: "XXXX-XXXX-XXXX",
        iban: "PK00MEZN0000000000000000",
      },
    },
    easypaisa: {
      title: "EasyPaisa",
      message: `Send ${formattedTotal} to our EasyPaisa account and share the transaction ID.`,
      steps: [
        `Send ${formattedTotal} via EasyPaisa to: 0300-XXXXXXX (ZEE BY ZOHAIB)`,
        "Note the 11-digit transaction ID from the confirmation SMS.",
        "Share the transaction ID on our WhatsApp: +92-XXX-XXXXXXX",
        "Your order will be confirmed once payment is verified.",
      ],
      accountDetails: {
        accountTitle: "ZEE BY ZOHAIB",
        accountNumber: "0300-XXXXXXX",
      },
    },
    jazzcash: {
      title: "JazzCash",
      message: `Send ${formattedTotal} to our JazzCash account and share the transaction ID.`,
      steps: [
        `Send ${formattedTotal} via JazzCash to: 0300-XXXXXXX (ZEE BY ZOHAIB)`,
        "Note the transaction reference number from the confirmation.",
        "Share the reference on our WhatsApp: +92-XXX-XXXXXXX",
        "Your order will be confirmed once payment is verified.",
      ],
      accountDetails: {
        accountTitle: "ZEE BY ZOHAIB",
        accountNumber: "0300-XXXXXXX",
      },
    },
    card: {
      title: "Debit / Credit Card",
      message: "Card payment processing is coming soon. Our team will contact you to arrange payment.",
      steps: [
        "Our team will reach out within 1 business day.",
        "You can alternatively switch to EasyPaisa, JazzCash, or Cash on Delivery.",
        "Your order is reserved for 24 hours.",
      ],
    },
  };

  return instructions[method] || null;
};

export const orderController = {
  placeOrder,
  getMyOrders,
  trackOrder,
  getOrderById,
  cancelOrder,
  getAllOrdersAdmin,
  getOrderSummary,
  updateOrderStatus,
};