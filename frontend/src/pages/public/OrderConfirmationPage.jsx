import { useEffect } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  Package,
  MapPin,
  MessageCircle,
  ArrowRight,
  Clock,
  Copy,
  Phone,
  Banknote,
} from "lucide-react";
import orderService from "../../services/orderService.js";
import toast from "react-hot-toast";
import { env } from "../../config/env.js";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const WHATSAPP = env.whatsappNumber;

const STATUS_LABELS = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_LABELS = {
  cod: "Cash on Delivery",
  bank_transfer: "Bank Transfer",
  easypaisa: "EasyPaisa",
  jazzcash: "JazzCash",
  card: "Debit / Credit Card",
};

// ─────────────────────────────────────────────
// ORDER CONFIRMATION PAGE
// ─────────────────────────────────────────────
export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Data comes from navigation state (immediate) or API (on refresh)
  const stateOrder = location.state?.order;
  const stateInstructions = location.state?.paymentInstructions;

  const { data: fetchedOrder, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getOrderById(orderId),
    enabled: !stateOrder && Boolean(orderId),
    staleTime: 5 * 60 * 1000,
  });

  const order = stateOrder || fetchedOrder;
  const paymentInstructions = stateInstructions || null;

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber).then(() => {
      toast.success("Order number copied!");
    });
  };

  if (isLoading || !order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#e5e0d8] border-t-[#c9a96e] rounded-full animate-spin" />
          <p className="text-sm text-[#888]">Loading your order…</p>
        </div>
      </div>
    );
  }

  const isCOD = order.payment?.method === "cod";
  const needsPayment = !isCOD && order.payment?.status === "pending";

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Success banner */}
      <div className="bg-[#1a1a1a] py-12 sm:py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-[#c9a96e]/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-[#c9a96e]" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-white mb-3">
            Order Placed!
          </h1>
          <p className="text-[#998f83] text-base max-w-md mx-auto">
            Thank you for shopping with ZEE.BY ZUNAISHA. We'll keep you updated every step of the way.
          </p>

          {/* Order number */}
          <div className="mt-6 inline-flex items-center gap-3 bg-white/10 border border-white/20 px-5 py-3 rounded-sm">
            <span className="text-[#998f83] text-xs tracking-[1.5px] uppercase">Order</span>
            <span className="font-mono text-[#c9a96e] font-bold tracking-wider text-base">
              {order.orderNumber}
            </span>
            <button
              onClick={copyOrderNumber}
              className="text-[#666] hover:text-[#c9a96e] transition-colors"
              aria-label="Copy order number"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Order details */}
          <div className="lg:col-span-2 space-y-5">

            {/* Payment instructions — for non-COD */}
            {needsPayment && paymentInstructions && (
              <div className="bg-amber-50 border-2 border-amber-300 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-600 shrink-0" />
                  <h2 className="text-sm font-bold text-amber-800 tracking-wide">
                    Action Required — Complete Your Payment
                  </h2>
                </div>
                <p className="text-sm text-amber-700">{paymentInstructions.message}</p>

                {paymentInstructions.steps?.length > 0 && (
                  <ol className="space-y-2">
                    {paymentInstructions.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-amber-800">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                )}

                {(paymentInstructions.bankDetails || paymentInstructions.accountDetails) && (
                  <div className="bg-white border border-amber-200 p-3 mt-2 font-mono text-sm space-y-1">
                    {Object.entries(
                      paymentInstructions.bankDetails || paymentInstructions.accountDetails || {}
                    ).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-[#888] capitalize min-w-[100px]">
                          {key.replace(/([A-Z])/g, " $1")}:
                        </span>
                        <span className="font-bold text-[#1a1a1a]">{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                <a
                  href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                    `Hi! I've made payment for order ${order.orderNumber}. Transaction ID: `
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white text-xs tracking-[1.5px] uppercase font-bold px-5 py-2.5 hover:bg-[#20bf5c] transition-colors"
                >
                  <MessageCircle size={14} />
                  Send Payment Proof via WhatsApp
                </a>
              </div>
            )}

            {/* COD instruction */}
            {isCOD && (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 p-4">
                <Banknote size={18} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Cash on Delivery</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    Please have{" "}
                    <strong>{formatPrice(order.pricing?.total)}</strong> ready when
                    our rider arrives. Exact change appreciated.
                  </p>
                </div>
              </div>
            )}

            {/* Order items */}
            <div className="bg-white border border-[#e8e0d4]">
              <div className="px-5 py-4 border-b border-[#ece8e0]">
                <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">
                  Items Ordered
                </h2>
              </div>
              <div className="divide-y divide-[#f0ebe3]">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 px-5 py-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-16 object-cover bg-[#f4f1ec] shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-16 bg-[#f4f1ec] flex items-center justify-center shrink-0">
                        <Package size={16} className="text-[#ccc]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a1a] line-clamp-2">
                        {item.name}
                      </p>
                      <p className="text-xs text-[#888] mt-1">
                        {item.variant?.color} · {item.variant?.size} · Qty {item.quantity}
                      </p>
                      <p className="text-xs font-semibold text-[#1a1a1a] mt-1">
                        {formatPrice(item.variant?.price)} each
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#1a1a1a] shrink-0">
                      {formatPrice(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address */}
            <div className="bg-white border border-[#e8e0d4] p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={15} className="text-[#c9a96e]" />
                <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">
                  Delivering To
                </h2>
              </div>
              <div className="text-sm text-[#555] space-y-0.5">
                <p className="font-semibold text-[#1a1a1a]">
                  {order.shippingAddress?.fullName}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone size={11} className="text-[#bbb]" />
                  {order.shippingAddress?.phone}
                </p>
                <p>{order.shippingAddress?.street}</p>
                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.province}
                  {order.shippingAddress?.postalCode &&
                    ` — ${order.shippingAddress.postalCode}`}
                </p>
              </div>
            </div>
          </div>

          {/* Right — Summary + actions */}
          <div className="space-y-5">
            {/* Pricing */}
            <div className="bg-white border border-[#e8e0d4] p-5 space-y-3">
              <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">
                Order Total
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#555]">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.pricing?.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#555]">
                  <span>Shipping</span>
                  {order.pricing?.shippingFee === 0 ? (
                    <span className="text-green-600 font-medium text-xs uppercase">Free</span>
                  ) : (
                    <span>{formatPrice(order.pricing?.shippingFee)}</span>
                  )}
                </div>
                <div className="border-t border-[#ece8e0] pt-2 flex justify-between font-bold text-base">
                  <span className="text-[#1a1a1a]">Total</span>
                  <span className="font-serif text-[#1a1a1a]">
                    {formatPrice(order.pricing?.total)}
                  </span>
                </div>
              </div>

              <div className="pt-1 space-y-1.5 text-xs text-[#888]">
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="font-medium text-[#555]">
                    {PAYMENT_LABELS[order.payment?.method]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="font-medium text-[#555]">
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Track order */}
            <div className="bg-white border border-[#e8e0d4] p-5 space-y-3">
              <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">
                Track Your Order
              </h2>
              <p className="text-xs text-[#777]">
                Use your order number and phone number to track your order at any time.
              </p>
              <Link
                to={`/track-order?orderNumber=${order.orderNumber}&phone=${order.shippingAddress?.phone}`}
                className="flex items-center justify-center gap-2 w-full border border-[#1a1a1a] text-[#1a1a1a] text-xs tracking-[1.5px] uppercase font-bold py-3 hover:bg-[#1a1a1a] hover:text-white transition-colors group"
              >
                <Package size={13} />
                Track Order
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* WhatsApp support */}
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                `Hi! I have a question about my order ${order.orderNumber}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-xs tracking-[1.5px] uppercase font-bold py-3 hover:bg-[#20bf5c] transition-colors"
            >
              <MessageCircle size={14} />
              Chat Support
            </a>

            {/* Continue shopping */}
            <Link
              to="/products"
              className="flex items-center justify-center gap-2 w-full bg-[#f0ebe3] text-[#555] text-xs tracking-[1.5px] uppercase font-bold py-3 hover:bg-[#e0d8ce] transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}