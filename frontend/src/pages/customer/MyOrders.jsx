import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Package, Clock, CheckCircle, Truck, ShoppingBag, ArrowRight, ChevronLeft, ChevronRight,
} from "lucide-react";
import orderService from "../../services/orderService.js";

const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const formatDate  = (iso) => new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

const STATUSES = [
  { value: "",          label: "All Orders" },
  { value: "pending",   label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing",label: "Processing" },
  { value: "shipped",   label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_CONFIG = {
  pending:    { label: "Pending",    badge: "bg-amber-100 text-amber-700",  icon: Clock },
  confirmed:  { label: "Confirmed",  badge: "bg-blue-100 text-blue-700",    icon: CheckCircle },
  processing: { label: "Processing", badge: "bg-purple-100 text-purple-700", icon: Package },
  shipped:    { label: "Shipped",    badge: "bg-indigo-100 text-indigo-700", icon: Truck },
  delivered:  { label: "Delivered",  badge: "bg-green-100 text-green-700",  icon: CheckCircle },
  cancelled:  { label: "Cancelled",  badge: "bg-red-100 text-red-700",      icon: Package },
};

const LIMIT = 10;

function OrderCard({ order }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const firstItem = order.items?.[0];

  return (
    <Link
      to={`/account/orders/${order._id}`}
      className="bg-white border border-[#e8e0d4] p-4 sm:p-5 hover:border-[#1a1a1a] hover:shadow-sm transition-all group block"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Thumbnail */}
        <div className="w-14 h-16 bg-[#f4f1ec] shrink-0 overflow-hidden">
          {firstItem?.image ? (
            <img src={firstItem.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={18} className="text-[#ccc]" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-sm font-bold text-[#1a1a1a] tracking-wide">
              {order.orderNumber}
            </span>
            <span className={`text-[10px] tracking-[1.5px] uppercase font-bold px-2 py-0.5 ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-[#888]">
            {order.items?.length} item{order.items?.length !== 1 ? "s" : ""}
            {firstItem?.name && ` · ${firstItem.name}${order.items?.length > 1 ? ` +${order.items.length - 1} more` : ""}`}
          </p>
          <p className="text-xs text-[#aaa] mt-1">{formatDate(order.createdAt)}</p>
        </div>

        {/* Price + arrow */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:shrink-0">
          <span className="text-sm font-semibold font-serif text-[#1a1a1a]">
            {formatPrice(order.pricing?.total)}
          </span>
          <ArrowRight
            size={14}
            className="text-[#bbb] group-hover:text-[#c9a96e] group-hover:translate-x-1 transition-all"
          />
        </div>
      </div>
    </Link>
  );
}

export default function MyOrders() {
  const [status, setStatus]   = useState("");
  const [page,   setPage]     = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["orders", "my", { page, limit: LIMIT, status: status || undefined }],
    queryFn:  () => orderService.getMyOrders({ page, limit: LIMIT, status: status || undefined }),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const orders     = data?.orders     || [];
  const total      = data?.total      || 0;
  const totalPages = data?.totalPages || 1;

  const handleStatusChange = (val) => {
    setStatus(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">My Orders</h1>
        {total > 0 && (
          <p className="text-xs text-[#888]">
            {total} order{total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleStatusChange(value)}
            className={`shrink-0 text-xs tracking-[1px] uppercase font-semibold px-3.5 py-2 border transition-colors ${
              status === value
                ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                : "border-[#d0c8be] text-[#555] hover:border-[#1a1a1a]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className={`space-y-3 transition-opacity ${isFetching && !isLoading ? "opacity-60" : "opacity-100"}`}>
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-[#e8e0d4] animate-pulse" />
          ))
        ) : orders.length === 0 ? (
          <div className="bg-white border border-[#e8e0d4] p-12 text-center">
            <ShoppingBag size={30} className="mx-auto text-[#ccc] mb-4" />
            <p className="text-sm font-semibold text-[#1a1a1a] mb-1">
              {status ? `No ${status} orders found` : "No orders yet"}
            </p>
            <p className="text-xs text-[#888] mb-5">
              {status ? "Try a different filter." : "Your order history will appear here."}
            </p>
            {!status && (
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-xs tracking-[1.5px] uppercase font-bold bg-[#1a1a1a] text-white px-6 py-2.5 hover:bg-[#c9a96e] transition-colors"
              >
                Start Shopping
              </Link>
            )}
          </div>
        ) : (
          orders.map((order) => <OrderCard key={order._id} order={order} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#888]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}