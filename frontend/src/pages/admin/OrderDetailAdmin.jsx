import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, MapPin, CreditCard, ChevronLeft, CheckCircle,
  Clock, Truck, ShoppingBag, MessageCircle, Copy, X, AlertCircle,
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

const STATUS_STEPS  = ["pending","confirmed","processing","shipped","delivered"];
const STATUS_CONFIG = {
  pending:    { label: "Pending",    badge: "bg-amber-100 text-amber-700" },
  confirmed:  { label: "Confirmed",  badge: "bg-blue-100 text-blue-700" },
  processing: { label: "Processing", badge: "bg-purple-100 text-purple-700" },
  shipped:    { label: "Shipped",    badge: "bg-indigo-100 text-indigo-700" },
  delivered:  { label: "Delivered",  badge: "bg-green-100 text-green-700" },
  cancelled:  { label: "Cancelled",  badge: "bg-red-100 text-red-700" },
};

const VALID_TRANSITIONS = {
  pending:    ["confirmed","cancelled"],
  confirmed:  ["processing","cancelled"],
  processing: ["shipped","cancelled"],
  shipped:    ["delivered"],
  delivered:  [],
  cancelled:  [],
};

function StatusPanel({ order, onUpdate, isUpdating }) {
  const [newStatus,      setNewStatus]      = useState("");
  const [note,           setNote]           = useState("");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "");

  const nextOptions = VALID_TRANSITIONS[order.status] || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newStatus) return toast.error("Select a status.");
    onUpdate({ status: newStatus, note: note.trim(), trackingNumber: trackingNumber.trim() });
  };

  return (
    <div className="bg-white border border-[#e8e0d4] p-5">
      <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a] mb-4">Update Status</h2>

      {nextOptions.length === 0 ? (
        <div className={`flex items-center gap-2 p-3 ${order.status === "delivered" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <CheckCircle size={14} className={order.status === "delivered" ? "text-green-500" : "text-red-400"} />
          <p className="text-xs font-medium text-[#555]">
            {order.status === "delivered" ? "Order completed — no further updates." : "Order cancelled — no further updates."}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] tracking-[1.5px] uppercase font-semibold text-[#888] block mb-1.5">New Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white">
              <option value="">Select next status</option>
              {nextOptions.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </select>
          </div>

          {(newStatus === "shipped" || order.trackingNumber) && (
            <div>
              <label className="text-[10px] tracking-[1.5px] uppercase font-semibold text-[#888] block mb-1.5">Tracking Number</label>
              <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter courier tracking number"
                className="w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white" />
            </div>
          )}

          <div>
            <label className="text-[10px] tracking-[1.5px] uppercase font-semibold text-[#888] block mb-1.5">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Internal note or customer message…" rows={2}
              className="w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white resize-none" />
          </div>

          <button type="submit" disabled={!newStatus || isUpdating}
            className="w-full bg-[#1a1a1a] text-white text-xs tracking-[1.5px] uppercase font-bold py-3 hover:bg-[#c9a96e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isUpdating ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Updating…</>
            ) : (
              <><CheckCircle size={13} />Update Order</>
            )}
          </button>
        </form>
      )}

      {/* History */}
      {order.statusHistory?.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#f0ebe3]">
          <p className="text-[10px] tracking-[1.5px] uppercase font-bold text-[#888] mb-3">History</p>
          <div className="space-y-2.5">
            {[...order.statusHistory].reverse().map((h, i) => (
              <div key={i} className="flex gap-2.5 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${STATUS_CONFIG[h.status]?.badge?.split(" ")[1] || "bg-[#888]"}`} style={{backgroundColor: undefined}} />
                <div>
                  <p className="font-semibold text-[#333] capitalize">{h.status}</p>
                  {h.note && <p className="text-[#888] italic">{h.note}</p>}
                  <p className="text-[#aaa]">{formatDate(h.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderDetailAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn:  () => orderService.getOrderById(id),
    staleTime: 30 * 1000,
  });

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: (payload) => orderService.updateOrderStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "order-summary"] });
      toast.success("Order status updated.");
    },
    onError: (err) => toast.error(err.message || "Could not update order."),
  });

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber).then(() => toast.success("Copied!"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-5xl">
        <div className="h-8 w-48 bg-[#ece8e0] rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 bg-white border border-[#e8e0d4]" />
            <div className="h-64 bg-white border border-[#e8e0d4]" />
          </div>
          <div className="space-y-4">
            <div className="h-64 bg-white border border-[#e8e0d4]" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={28} className="mx-auto text-[#ccc] mb-3" />
        <p className="text-sm text-[#888] mb-4">Order not found.</p>
        <Link to="/admin/orders" className="text-xs text-[#c9a96e] hover:underline">← Back to Orders</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const customerName = order.user?.name || order.guestInfo?.name || "Guest";
  const customerPhone = order.shippingAddress?.phone;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => navigate("/admin/orders")} className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#c9a96e] transition-colors mb-3">
            <ChevronLeft size={13} /> Orders
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-mono text-xl font-bold text-[#1a1a1a] tracking-wider">{order.orderNumber}</h1>
            <span className={`text-[10px] tracking-[1.5px] uppercase font-bold px-2.5 py-1 ${cfg.badge}`}>{cfg.label}</span>
            <button onClick={copyOrderNumber} className="text-[#bbb] hover:text-[#c9a96e] transition-colors">
              <Copy size={13} />
            </button>
          </div>
          <p className="text-xs text-[#888] mt-1">Placed {formatDate(order.createdAt)}</p>
        </div>
        <a
          href={`https://wa.me/${customerPhone?.replace(/^0/, "92")}?text=${encodeURIComponent(`Hi ${customerName}! Regarding your order ${order.orderNumber}:`)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#25D366] text-white text-xs tracking-[1.5px] uppercase font-bold px-5 py-2.5 hover:bg-[#20bf5c] transition-colors"
        >
          <MessageCircle size={14} /> WhatsApp Customer
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — items + address */}
        <div className="lg:col-span-2 space-y-5">

          {/* Order items */}
          <div className="bg-white border border-[#e8e0d4]">
            <div className="px-5 py-4 border-b border-[#ece8e0]">
              <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">Items ({order.items?.length})</h2>
            </div>
            <div className="divide-y divide-[#f0ebe3]">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-12 h-14 bg-[#f4f1ec] shrink-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-[#ccc]" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a1a] line-clamp-1">{item.name}</p>
                    <p className="text-xs text-[#888] mt-0.5">{item.variant?.color} · {item.variant?.size} · Qty {item.quantity}</p>
                    {item.variant?.sku && <p className="text-[10px] text-[#aaa] font-mono">{item.variant.sku}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[#888]">{formatPrice(item.variant?.price)} × {item.quantity}</p>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{formatPrice(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer + address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white border border-[#e8e0d4] p-5">
              <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a] mb-3">Customer</h2>
              <p className="text-sm font-semibold text-[#1a1a1a]">{customerName}</p>
              {(order.user?.email || order.guestInfo?.email) && (
                <p className="text-xs text-[#888] mt-0.5">{order.user?.email || order.guestInfo?.email}</p>
              )}
              <p className="text-xs text-[#888]">{order.shippingAddress?.phone}</p>
              <span className="inline-block mt-2 text-[9px] tracking-[1.5px] uppercase font-bold bg-[#f0ebe3] text-[#888] px-1.5 py-0.5">
                {order.user ? "Registered" : "Guest"}
              </span>
            </div>

            <div className="bg-white border border-[#e8e0d4] p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-[#c9a96e]" />
                <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">Ship To</h2>
              </div>
              <div className="text-sm text-[#555] space-y-0.5">
                <p className="font-semibold text-[#1a1a1a]">{order.shippingAddress?.fullName}</p>
                <p>{order.shippingAddress?.street}</p>
                <p>{order.shippingAddress?.city}, {order.shippingAddress?.province}</p>
                {order.shippingAddress?.postalCode && <p>{order.shippingAddress.postalCode}</p>}
              </div>
              {order.notes && (
                <p className="text-xs text-[#888] italic mt-2 border-l-2 border-[#c9a96e] pl-2">{order.notes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right — summary + status update */}
        <div className="space-y-5">
          {/* Financial summary */}
          <div className="bg-white border border-[#e8e0d4] p-5 space-y-3">
            <h2 className="text-xs tracking-[2px] uppercase font-bold text-[#1a1a1a]">Payment</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#555]">
                <span>Subtotal</span><span>{formatPrice(order.pricing?.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#555]">
                <span>Shipping</span>
                {order.pricing?.shippingFee === 0 ? (
                  <span className="text-green-600 text-xs font-medium uppercase">Free</span>
                ) : (
                  <span>{formatPrice(order.pricing?.shippingFee)}</span>
                )}
              </div>
              <div className="border-t border-[#ece8e0] pt-1.5 flex justify-between font-bold text-base">
                <span className="text-[#1a1a1a]">Total</span>
                <span className="font-serif text-[#1a1a1a]">{formatPrice(order.pricing?.total)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-[#ece8e0] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#888]">Method</span>
                <span className="font-medium text-[#555]">{PAYMENT_LABELS[order.payment?.method] || order.payment?.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888]">Status</span>
                <span className={`font-medium ${order.payment?.status === "paid" ? "text-green-600" : "text-amber-600"}`}>
                  {order.payment?.status === "paid" ? "Paid" : "Pending"}
                </span>
              </div>
              {order.payment?.transactionId && (
                <div className="flex justify-between">
                  <span className="text-[#888]">Ref</span>
                  <span className="font-mono text-[#555]">{order.payment.transactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status update panel */}
          <StatusPanel order={order} onUpdate={updateStatus} isUpdating={isPending} />
        </div>
      </div>
    </div>
  );
}