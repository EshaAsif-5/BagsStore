import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, MapPin, CreditCard, Clock, CheckCircle, Truck,
  ShoppingBag, MessageCircle, AlertCircle, ChevronLeft, Copy, X,
} from "lucide-react";
import orderService from "../../services/orderService.js";
import toast from "react-hot-toast";

const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const formatDate  = (iso) => new Date(iso).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || "923001234567";

const PAYMENT_LABELS = {
  cod: "Cash on Delivery", bank_transfer: "Bank Transfer",
  easypaisa: "EasyPaisa", jazzcash: "JazzCash", card: "Card",
};

const STATUS_STEPS = [
  { key: "pending",    label: "Placed",     icon: ShoppingBag },
  { key: "confirmed",  label: "Confirmed",   icon: CheckCircle },
  { key: "processing", label: "Processing",  icon: Package },
  { key: "shipped",    label: "Shipped",     icon: Truck },
  { key: "delivered",  label: "Delivered",   icon: CheckCircle },
];
const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

const STATUS_CONFIG = {
  pending:    { label: "Pending",    badge: "bg-amber-100 text-amber-700" },
  confirmed:  { label: "Confirmed",  badge: "bg-blue-100 text-blue-700" },
  processing: { label: "Processing", badge: "bg-purple-100 text-purple-700" },
  shipped:    { label: "Shipped",    badge: "bg-indigo-100 text-indigo-700" },
  delivered:  { label: "Delivered",  badge: "bg-green-100 text-green-700" },
  cancelled:  { label: "Cancelled",  badge: "bg-red-100 text-red-700" },
};

function StatusTimeline({ status, statusHistory = [] }) {
  const historyMap = Object.fromEntries(statusHistory.map((h) => [h.status, h]));
  const cancelled = status === "cancelled";

  if (cancelled) {
    const entry = historyMap.cancelled;
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200">
        <X size={16} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">Order Cancelled</p>
          {entry?.note && <p className="text-xs text-red-600 mt-0.5">{entry.note}</p>}
          {entry?.timestamp && <p className="text-[11px] text-red-400 mt-1">{formatDate(entry.timestamp)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-4 bottom-4 w-px bg-[#e0d8ce]" />
      <div className="space-y-0">
        {STATUS_STEPS.map((step, idx) => {
          const currentIdx = STATUS_ORDER.indexOf(status);
          const stepIdx    = STATUS_ORDER.indexOf(step.key);
          const done       = stepIdx < currentIdx;
          const active     = stepIdx === currentIdx;
          const upcoming   = stepIdx > currentIdx;
          const history    = historyMap[step.key];
          const Icon       = step.icon;

          return (
            <div key={step.key} className={`relative flex gap-4 ${idx < STATUS_STEPS.length - 1 ? "pb-5" : ""}`}>
              <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                done   ? "bg-[#1a1a1a] border-[#1a1a1a]" :
                active ? "bg-[#c9a96e] border-[#c9a96e]" :
                         "bg-white border-[#d0c8be]"
              }`}>
                <Icon size={13} className={done || active ? "text-white" : "text-[#bbb]"} />
              </div>
              <div className={`pt-0.5 ${upcoming ? "opacity-40" : ""}`}>
                <p className={`text-sm font-semibold ${active ? "text-[#c9a96e]" : done ? "text-[#1a1a1a]" : "text-[#888]"}`}>
                  {step.label}
                  {active && (
                    <span className="ml-2 text-[9px] tracking-[1.5px] uppercase bg-[#c9a96e] text-white px-1.5 py-0.5 font-bold">
                      Current
                    </span>
                  )}
                </p>
                {history?.timestamp && (
                  <p className="text-[10px] text-[#aaa] mt-0.5 flex items-center gap-1">
                    <Clock size={9} />{formatDate(history.timestamp)}
                  </p>
                )}
                {history?.note && (
                  <p className="text-[11px] text-[#666] italic mt-1 pl-2 border-l-2 border-[#c9a96e]">{history.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CancelModal({ orderNumber, onConfirm, onClose, isLoading }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#888] hover:text-[#1a1a1a]">
          <X size={18} />
        </button>
        <div className="flex items-start gap-3 mb-5">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-serif text-lg text-[#1a1a1a]">Cancel Order</h3>
            <p className="text-xs text-[#888] mt-1">Order <strong className="font-mono">{orderNumber}</strong></p>
          </div>
        </div>
        <p className="text-sm text-[#555] mb-4">
          Are you sure you want to cancel this order? This action cannot be undone.
        </p>
        <div className="mb-5">
          <label className="text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] block mb-1.5">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tell us why you're cancelling…"
            rows={3}
            className="w-full border border-[#d0c8be] px-3 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-[#d0c8be] text-[#555] text-xs tracking-[1.5px] uppercase font-semibold py-3 hover:border-[#1a1a1a] transition-colors"
          >
            Keep Order
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isLoading}
            className="flex-1 bg-red-500 text-white text-xs tracking-[1.5px] uppercase font-semibold py-3 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Cancelling…" : "Cancel Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn:  () => orderService.getOrderById(id),
    staleTime: 60 * 1000,
  });

  const { mutate: cancelOrder, isPending: isCancelling } = useMutation({
    mutationFn: (reason) => orderService.cancelOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      setShowCancel(false);
      toast.success("Order cancelled successfully.");
    },
    onError: (err) => {
      toast.error(err.message || "Could not cancel order.");
    },
  });

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber).then(() => toast.success("Copied!"));
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[#ece8e0] rounded-full" />
        <div className="h-32 bg-white border border-[#e8e0d4]" />
        <div className="h-48 bg-white border border-[#e8e0d4]" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[#888] mb-4">Order not found.</p>
        <Link to="/account/orders" className="text-xs text-[#c9a96e] hover:underline font-medium">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const canCancel = ["pending", "confirmed"].includes(order.status);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => navigate("/account/orders")}
              className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#c9a96e] transition-colors mb-3"
            >
              <ChevronLeft size={13} /> Back to Orders
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-mono text-xl font-bold text-[#1a1a1a] tracking-wider">
                {order.orderNumber}
              </h1>
              <span className={`text-[10px] tracking-[1.5px] uppercase font-bold px-2.5 py-1 ${cfg.badge}`}>
                {cfg.label}
              </span>
              <button onClick={copyOrderNumber} className="text-[#bbb] hover:text-[#c9a96e] transition-colors">
                <Copy size={13} />
              </button>
            </div>
            <p className="text-xs text-[#888] mt-1">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          {canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              className="flex items-center gap-1.5 text-xs tracking-[1.5px] uppercase font-semibold text-red-500 border border-red-200 px-4 py-2.5 hover:bg-red-50 transition-colors"
            >
              <X size={13} /> Cancel Order
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">

            {/* Status timeline */}
            <div className="bg-white border border-[#e8e0d4] p-5">
              <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a] mb-5">
                Order Progress
              </h2>
              <StatusTimeline status={order.status} statusHistory={order.statusHistory} />
              {order.trackingNumber && (
                <div className="mt-5 p-3 bg-[#f9f7f4] border border-[#e0d8ce] flex items-center gap-3">
                  <Truck size={15} className="text-[#c9a96e] shrink-0" />
                  <div>
                    <p className="text-[10px] tracking-[1.5px] uppercase text-[#888] font-semibold">Tracking Number</p>
                    <p className="text-sm font-mono font-bold text-[#1a1a1a] mt-0.5">{order.trackingNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white border border-[#e8e0d4]">
              <div className="px-5 py-4 border-b border-[#ece8e0]">
                <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">
                  Items ({order.items?.length})
                </h2>
              </div>
              <div className="divide-y divide-[#f0ebe3]">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-14 h-16 bg-[#f4f1ec] shrink-0 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={14} className="text-[#ccc]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a1a] line-clamp-1">{item.name}</p>
                      <p className="text-xs text-[#888] mt-0.5">
                        {item.variant?.color} · {item.variant?.size} · Qty {item.quantity}
                      </p>
                      <p className="text-xs text-[#555] mt-0.5">{formatPrice(item.variant?.price)} each</p>
                    </div>
                    <p className="text-sm font-semibold text-[#1a1a1a] shrink-0">{formatPrice(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Order total */}
            <div className="bg-white border border-[#e8e0d4] p-5 space-y-3">
              <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#555]">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.pricing?.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#555]">
                  <span>Shipping</span>
                  {order.pricing?.shippingFee === 0 ? (
                    <span className="text-green-600 text-xs font-medium uppercase">Free</span>
                  ) : (
                    <span>{formatPrice(order.pricing?.shippingFee)}</span>
                  )}
                </div>
                <div className="border-t border-[#ece8e0] pt-2 flex justify-between font-bold text-base">
                  <span className="text-[#1a1a1a]">Total</span>
                  <span className="font-serif text-[#1a1a1a]">{formatPrice(order.pricing?.total)}</span>
                </div>
              </div>
              <div className="pt-1 border-t border-[#ece8e0] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#888]">Payment</span>
                  <span className="font-medium text-[#555]">{PAYMENT_LABELS[order.payment?.method]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888]">Payment Status</span>
                  <span className={`font-medium ${order.payment?.status === "paid" ? "text-green-600" : "text-amber-600"}`}>
                    {order.payment?.status === "paid" ? "Paid" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping address */}
            <div className="bg-white border border-[#e8e0d4] p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-[#c9a96e]" />
                <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">Delivery Address</h2>
              </div>
              <div className="text-sm text-[#555] space-y-0.5">
                <p className="font-semibold text-[#1a1a1a]">{order.shippingAddress?.fullName}</p>
                <p>{order.shippingAddress?.phone}</p>
                <p>{order.shippingAddress?.street}</p>
                <p>{order.shippingAddress?.city}, {order.shippingAddress?.province}</p>
                {order.shippingAddress?.postalCode && <p>{order.shippingAddress.postalCode}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Link
                to={`/track-order?orderNumber=${order.orderNumber}&phone=${order.shippingAddress?.phone}`}
                className="flex items-center justify-center gap-2 w-full border border-[#1a1a1a] text-[#1a1a1a] text-xs tracking-[1.5px] uppercase font-bold py-3 hover:bg-[#1a1a1a] hover:text-white transition-colors"
              >
                <Package size={13} /> Track Order
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi! I have a question about my order ${order.orderNumber}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-xs tracking-[1.5px] uppercase font-bold py-3 hover:bg-[#20bf5c] transition-colors"
              >
                <MessageCircle size={13} /> WhatsApp Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {showCancel && (
        <CancelModal
          orderNumber={order.orderNumber}
          onConfirm={(reason) => cancelOrder(reason)}
          onClose={() => setShowCancel(false)}
          isLoading={isCancelling}
        />
      )}
    </>
  );
}