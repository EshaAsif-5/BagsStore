import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  Package,
  Search,
  CheckCircle,
  Circle,
  Truck,
  MapPin,
  Clock,
  Phone,
  AlertCircle,
  MessageCircle,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import orderService from "../../services/orderService.js";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || "923001234567";

const PAYMENT_LABELS = {
  cod: "Cash on Delivery",
  bank_transfer: "Bank Transfer",
  easypaisa: "EasyPaisa",
  jazzcash: "JazzCash",
  card: "Card",
};

// ─────────────────────────────────────────────
// STATUS TIMELINE CONFIG
// ─────────────────────────────────────────────
const STATUS_STEPS = [
  {
    key: "pending",
    label: "Order Placed",
    desc: "Your order has been received.",
    icon: ShoppingBag,
  },
  {
    key: "confirmed",
    label: "Confirmed",
    desc: "Your order has been verified.",
    icon: CheckCircle,
  },
  {
    key: "processing",
    label: "Processing",
    desc: "Your items are being packed.",
    icon: Package,
  },
  {
    key: "shipped",
    label: "Shipped",
    desc: "Your order is on its way.",
    icon: Truck,
  },
  {
    key: "delivered",
    label: "Delivered",
    desc: "Order delivered successfully.",
    icon: MapPin,
  },
];

const STATUS_ORDER = ["pending", "confirmed", "processing", "shipped", "delivered"];

function getStepState(stepKey, currentStatus) {
  if (currentStatus === "cancelled") return "cancelled";
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "upcoming";
}

// ─────────────────────────────────────────────
// STATUS TIMELINE
// ─────────────────────────────────────────────
function StatusTimeline({ status, statusHistory = [] }) {
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200">
        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-700">Order Cancelled</p>
          {statusHistory.find((h) => h.status === "cancelled")?.note && (
            <p className="text-xs text-red-600 mt-0.5">
              {statusHistory.find((h) => h.status === "cancelled").note}
            </p>
          )}
          {statusHistory.find((h) => h.status === "cancelled")?.timestamp && (
            <p className="text-[11px] text-red-400 mt-1">
              {formatDate(statusHistory.find((h) => h.status === "cancelled").timestamp)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Map statusHistory to a lookup for timestamps
  const historyMap = {};
  statusHistory.forEach((h) => {
    historyMap[h.status] = h;
  });

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-[#e0d8ce]" />

      <div className="space-y-0">
        {STATUS_STEPS.map((step, idx) => {
          const state = getStepState(step.key, status);
          const history = historyMap[step.key];
          const Icon = step.icon;
          const isLast = idx === STATUS_STEPS.length - 1;

          return (
            <div key={step.key} className={`relative flex gap-4 ${!isLast ? "pb-6" : ""}`}>
              {/* Icon */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                  state === "done"
                    ? "bg-[#1a1a1a] border-[#1a1a1a]"
                    : state === "active"
                      ? "bg-[#c9a96e] border-[#c9a96e]"
                      : "bg-white border-[#d0c8be]"
                }`}
              >
                <Icon
                  size={14}
                  className={
                    state === "done" || state === "active"
                      ? "text-white"
                      : "text-[#bbb]"
                  }
                />
              </div>

              {/* Content */}
              <div className={`pt-0.5 ${state === "upcoming" ? "opacity-40" : ""}`}>
                <p
                  className={`text-sm font-semibold ${
                    state === "active"
                      ? "text-[#c9a96e]"
                      : state === "done"
                        ? "text-[#1a1a1a]"
                        : "text-[#888]"
                  }`}
                >
                  {step.label}
                  {state === "active" && (
                    <span className="ml-2 text-[9px] tracking-[1.5px] uppercase bg-[#c9a96e] text-white px-1.5 py-0.5 rounded-sm font-bold">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#888] mt-0.5">{step.desc}</p>
                {history?.timestamp && (
                  <p className="text-[10px] text-[#aaa] mt-1 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(history.timestamp)}
                  </p>
                )}
                {history?.note && state !== "pending" && (
                  <p className="text-[11px] text-[#666] italic mt-1 bg-[#f9f7f4] px-2 py-1 border-l-2 border-[#c9a96e]">
                    {history.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TRACK FORM SCHEMA
// ─────────────────────────────────────────────
const trackSchema = z.object({
  orderNumber: z
    .string()
    .regex(/^ZEE-\d{4}-\d{5}$/, "Format: ZEE-YYYY-NNNNN (e.g. ZEE-2024-00001)"),
  phone: z
    .string()
    .regex(/^(\+92|0)[0-9]{10}$/, "Enter the phone number used at checkout"),
});

// ─────────────────────────────────────────────
// TRACK ORDER PAGE
// ─────────────────────────────────────────────
export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [tracking, setTracking] = useState(null);

  const prefillOrderNumber = searchParams.get("orderNumber") || "";
  const prefillPhone = searchParams.get("phone") || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(trackSchema),
    defaultValues: {
      orderNumber: prefillOrderNumber,
      phone: prefillPhone,
    },
  });

  const { mutate, isPending, isError, error, reset } = useMutation({
    mutationFn: ({ orderNumber, phone }) =>
      orderService.trackOrder({ orderNumber, phone }),
    onSuccess: (data) => {
      setTracking(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: () => {
      setTracking(null);
    },
  });

  const handleTrack = (data) => {
    reset();
    setTracking(null);
    mutate(data);
  };

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Header */}
      <div className="bg-white border-b border-[#ece8e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="text-[11px] tracking-[1.5px] uppercase text-[#aaa] mb-3 flex items-center gap-2">
            <a href="/" className="hover:text-[#c9a96e] transition-colors">Home</a>
            <span>/</span>
            <span className="text-[#555]">Track Order</span>
          </nav>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
            Track Your Order
          </h1>
          <p className="text-sm text-[#888] mt-2">
            Enter your order number and phone number to check your order status.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

        {/* Search form */}
        <div className="bg-white border border-[#e8e0d4] p-5 sm:p-7 mb-8">
          <form onSubmit={handleSubmit(handleTrack)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] mb-1.5">
                  Order Number <span className="text-[#c9a96e]">*</span>
                </label>
                <input
                  {...register("orderNumber")}
                  placeholder="ZEE-2024-00001"
                  className="w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] bg-white font-mono tracking-wider"
                />
                {errors.orderNumber && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {errors.orderNumber.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] mb-1.5">
                  Phone Number <span className="text-[#c9a96e]">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
                  <input
                    {...register("phone")}
                    placeholder="03001234567"
                    className="w-full border border-[#d0c8be] pl-9 pr-3.5 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] bg-white"
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-bold px-10 py-3.5 hover:bg-[#c9a96e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search size={14} />
                  Track Order
                </>
              )}
            </button>
          </form>

          {/* Error state */}
          {isError && (
            <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Order Not Found</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {error?.message ||
                    "No order found with this number and phone combination. Please double-check your details."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tracking result */}
        {tracking && (
          <div className="space-y-6">

            {/* Status banner */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border ${
                tracking.status === "delivered"
                  ? "bg-green-50 border-green-200"
                  : tracking.status === "cancelled"
                    ? "bg-red-50 border-red-200"
                    : "bg-[#fffbf5] border-[#e0d8ce]"
              }`}
            >
              <div>
                <p className="text-[10px] tracking-[2px] uppercase font-semibold text-[#888] mb-1">
                  Order Number
                </p>
                <p className="font-mono font-bold text-[#1a1a1a] text-lg tracking-wider">
                  {tracking.orderNumber}
                </p>
              </div>
              <div className="text-right sm:text-right">
                <p className="text-[10px] tracking-[2px] uppercase font-semibold text-[#888] mb-1">
                  Status
                </p>
                <span
                  className={`inline-block text-xs tracking-[1.5px] uppercase font-bold px-3 py-1.5 ${
                    tracking.status === "delivered"
                      ? "bg-green-600 text-white"
                      : tracking.status === "cancelled"
                        ? "bg-red-500 text-white"
                        : tracking.status === "shipped"
                          ? "bg-blue-600 text-white"
                          : "bg-[#c9a96e] text-[#1a1a1a]"
                  }`}
                >
                  {tracking.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Timeline */}
              <div className="lg:col-span-3 bg-white border border-[#e8e0d4] p-5 sm:p-7">
                <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a] mb-6">
                  Shipment Progress
                </h2>
                <StatusTimeline
                  status={tracking.status}
                  statusHistory={tracking.statusHistory || []}
                />

                {/* Tracking number */}
                {tracking.trackingNumber && (
                  <div className="mt-6 p-3.5 bg-[#f9f7f4] border border-[#e0d8ce] flex items-center gap-3">
                    <Truck size={16} className="text-[#c9a96e] shrink-0" />
                    <div>
                      <p className="text-[10px] tracking-[1.5px] uppercase text-[#888] font-semibold">
                        Tracking Number
                      </p>
                      <p className="text-sm font-mono font-bold text-[#1a1a1a] mt-0.5">
                        {tracking.trackingNumber}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Order info sidebar */}
              <div className="lg:col-span-2 space-y-5">

                {/* Delivery info */}
                <div className="bg-white border border-[#e8e0d4] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} className="text-[#c9a96e]" />
                    <h3 className="text-xs tracking-[1.5px] uppercase font-bold text-[#1a1a1a]">
                      Delivering To
                    </h3>
                  </div>
                  <div className="text-sm text-[#555] space-y-0.5">
                    {tracking.shippingTo?.city && (
                      <p className="font-medium text-[#1a1a1a]">
                        {tracking.shippingTo.city}
                      </p>
                    )}
                    {tracking.shippingTo?.province && (
                      <p>{tracking.shippingTo.province}</p>
                    )}
                  </div>
                </div>

                {/* Order summary */}
                {tracking.items?.length > 0 && (
                  <div className="bg-white border border-[#e8e0d4] p-5">
                    <h3 className="text-xs tracking-[1.5px] uppercase font-bold text-[#1a1a1a] mb-3">
                      Items
                    </h3>
                    <div className="space-y-2.5">
                      {tracking.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-[#555] truncate flex-1 mr-3">
                            {item.name}
                            {(item.variant?.color || item.variant?.size) && (
                              <span className="text-[#aaa] text-xs ml-1">
                                ({[item.variant?.color, item.variant?.size].filter(Boolean).join(", ")})
                              </span>
                            )}
                            {item.quantity > 1 && (
                              <span className="text-[#aaa] ml-1">×{item.quantity}</span>
                            )}
                          </span>
                          <span className="font-medium text-[#1a1a1a] shrink-0">
                            {formatPrice(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {tracking.pricing && (
                      <div className="mt-3 pt-3 border-t border-[#ece8e0] flex justify-between font-bold text-sm">
                        <span className="text-[#1a1a1a]">Total</span>
                        <span className="text-[#1a1a1a]">
                          {formatPrice(tracking.pricing.total)}
                        </span>
                      </div>
                    )}
                    {tracking.paymentMethod && (
                      <p className="text-xs text-[#888] mt-2">
                        via {PAYMENT_LABELS[tracking.paymentMethod] || tracking.paymentMethod}
                      </p>
                    )}
                  </div>
                )}

                {/* Dates */}
                {(tracking.placedAt || tracking.deliveredAt) && (
                  <div className="bg-white border border-[#e8e0d4] p-5 space-y-2.5">
                    <h3 className="text-xs tracking-[1.5px] uppercase font-bold text-[#1a1a1a]">
                      Dates
                    </h3>
                    {tracking.placedAt && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[#888]">Ordered</span>
                        <span className="text-[#555] font-medium">
                          {formatDate(tracking.placedAt)}
                        </span>
                      </div>
                    )}
                    {tracking.deliveredAt && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[#888]">Delivered</span>
                        <span className="text-green-600 font-semibold">
                          {formatDate(tracking.deliveredAt)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* WhatsApp support */}
                <a
                  href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                    `Hi! I have a question about my order ${tracking.orderNumber}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-xs tracking-[1.5px] uppercase font-bold py-3 hover:bg-[#20bf5c] transition-colors"
                >
                  <MessageCircle size={14} />
                  Chat with Support
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Empty state / help */}
        {!tracking && !isError && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#f0ebe3] flex items-center justify-center mx-auto mb-4">
              <Package size={26} className="text-[#c9a96e]" />
            </div>
            <p className="text-sm text-[#888] mb-1">
              Enter your order details above to track your shipment.
            </p>
            <p className="text-xs text-[#aaa]">
              Your order number was sent to your phone/email after placing the order.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <a
                href={`https://wa.me/${WHATSAPP}?text=Hi! I need help tracking my order.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#25D366] hover:underline font-medium"
              >
                <MessageCircle size={13} />
                Need help? WhatsApp us
              </a>
              <span className="text-[#ddd]">·</span>
              <a
                href="/contact"
                className="text-xs text-[#888] hover:text-[#c9a96e] transition-colors"
              >
                Contact Us <ArrowRight size={11} className="inline" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}