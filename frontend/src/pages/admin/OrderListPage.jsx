import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, Search, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import orderService from "../../services/orderService.js";

const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const formatDate  = (iso) => new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending",    label: "Pending" },
  { value: "confirmed",  label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped",    label: "Shipped" },
  { value: "delivered",  label: "Delivered" },
  { value: "cancelled",  label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "",              label: "All Payments" },
  { value: "cod",           label: "Cash on Delivery" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "easypaisa",     label: "EasyPaisa" },
  { value: "jazzcash",      label: "JazzCash" },
  { value: "card",          label: "Card" },
];

const STATUS_CONFIG = {
  pending:    "bg-amber-100 text-amber-700",
  confirmed:  "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped:    "bg-indigo-100 text-indigo-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-700",
};

const LIMIT = 20;

export default function OrderListPage() {
  const [status,  setStatus]  = useState("");
  const [payment, setPayment] = useState("");
  const [sortBy,  setSortBy]  = useState("newest");
  const [page,    setPage]    = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "orders", { page, limit: LIMIT, status, paymentMethod: payment, sortBy }],
    queryFn:  () => orderService.getAllOrdersAdmin({
      page, limit: LIMIT,
      status:        status  || undefined,
      paymentMethod: payment || undefined,
      sortBy,
    }),
    keepPreviousData: true,
    staleTime: 30 * 1000,
  });

  const orders     = data?.orders     || [];
  const total      = data?.total      || 0;
  const totalPages = data?.totalPages || 1;

  const handleFilter = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">Orders</h1>
          <p className="text-xs text-[#888] mt-1">{total} order{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={status}  onChange={handleFilter(setStatus)}
          className="border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={payment} onChange={handleFilter(setPayment)}
          className="border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white">
          {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={sortBy}  onChange={(e) => setSortBy(e.target.value)}
          className="border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="total-desc">Total: High to Low</option>
          <option value="total-asc">Total: Low to High</option>
        </select>
      </div>

      {/* Table */}
      <div className={`bg-white border border-[#e8e0d4] overflow-hidden transition-opacity ${isFetching && !isLoading ? "opacity-70" : "opacity-100"}`}>
        {isLoading ? (
          <div className="divide-y divide-[#f0ebe3]">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-3 w-36 bg-[#ece8e0] rounded-full" />
                <div className="h-3 w-28 bg-[#ece8e0] rounded-full ml-auto" />
                <div className="h-5 w-20 bg-[#ece8e0] rounded-sm" />
                <div className="h-3 w-20 bg-[#ece8e0] rounded-full" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={28} className="mx-auto text-[#ccc] mb-3" />
            <p className="text-sm text-[#888]">No orders found.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid grid-cols-[180px_1fr_120px_100px_120px_40px] gap-4 px-5 py-3 border-b border-[#f0ebe3] bg-[#f9f7f4]">
              {["Order #","Customer","Date","Status","Total",""].map((h) => (
                <p key={h} className="text-[10px] tracking-[2px] uppercase font-bold text-[#888]">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-[#f0ebe3]">
              {orders.map((order) => {
                const customerName = order.user?.name || order.guestInfo?.name || "Guest";
                return (
                  <Link
                    key={order._id}
                    to={`/admin/orders/${order._id}`}
                    className="flex flex-col lg:grid lg:grid-cols-[180px_1fr_120px_100px_120px_40px] gap-2 lg:gap-4 items-start lg:items-center px-5 py-4 hover:bg-[#f9f7f4] transition-colors group"
                  >
                    <span className="font-mono text-sm font-bold text-[#1a1a1a] tracking-wide">{order.orderNumber}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-[#333] truncate">{customerName}</p>
                      <p className="text-xs text-[#aaa]">{order.shippingAddress?.city}</p>
                    </div>
                    <p className="text-xs text-[#888]">{formatDate(order.createdAt)}</p>
                    <span className={`text-[9px] tracking-[1.5px] uppercase font-bold px-2 py-1 w-fit ${STATUS_CONFIG[order.status] || ""}`}>
                      {order.status}
                    </span>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{formatPrice(order.pricing?.total)}</p>
                    <ArrowRight size={13} className="text-[#bbb] group-hover:text-[#c9a96e] group-hover:translate-x-1 transition-all hidden lg:block" />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#888]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-9 h-9 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-9 h-9 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}