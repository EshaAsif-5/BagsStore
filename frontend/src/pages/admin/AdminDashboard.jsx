import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Package, ShoppingBag, Star, MessageSquare,
  TrendingUp, Clock, CheckCircle, Truck, ArrowRight, AlertCircle,
} from "lucide-react";
import orderService from "../../services/orderService.js";
import reviewService from "../../services/reviewService.js";
import contactService from "../../services/contactService.js";

const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const formatDate  = (iso) => new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

const STATUS_CONFIG = {
  pending:    { label: "Pending",    badge: "bg-amber-100 text-amber-700" },
  confirmed:  { label: "Confirmed",  badge: "bg-blue-100 text-blue-700" },
  processing: { label: "Processing", badge: "bg-purple-100 text-purple-700" },
  shipped:    { label: "Shipped",    badge: "bg-indigo-100 text-indigo-700" },
  delivered:  { label: "Delivered",  badge: "bg-green-100 text-green-700" },
  cancelled:  { label: "Cancelled",  badge: "bg-red-100 text-red-700" },
};

function StatCard({ label, value, sub, icon: Icon, color, to }) {
  const Inner = (
    <div className={`bg-white border border-[#e8e0d4] p-5 flex items-start gap-4 ${to ? "hover:border-[#1a1a1a] hover:shadow-sm transition-all group" : ""}`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-serif font-semibold text-[#1a1a1a] leading-none">{value ?? "—"}</p>
        <p className="text-xs text-[#888] mt-1 tracking-wide">{label}</p>
        {sub && <p className="text-[11px] text-[#aaa] mt-0.5">{sub}</p>}
      </div>
      {to && <ArrowRight size={14} className="ml-auto text-[#bbb] group-hover:text-[#c9a96e] group-hover:translate-x-1 transition-all shrink-0 mt-1" />}
    </div>
  );
  return to ? <Link to={to}>{Inner}</Link> : Inner;
}

export default function AdminDashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["admin", "order-summary"],
    queryFn:  () => orderService.getOrderSummary(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: recentData, isLoading: loadingRecent } = useQuery({
    queryKey: ["admin", "orders", { page: 1, limit: 6 }],
    queryFn:  () => orderService.getAllOrdersAdmin({ page: 1, limit: 6, sortBy: "newest" }),
    staleTime: 60 * 1000,
  });

  const { data: pendingReviews } = useQuery({
    queryKey: ["admin", "pending-reviews"],
    queryFn:  () => reviewService.getPendingCount(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: unreadContacts } = useQuery({
    queryKey: ["admin", "unread-contacts"],
    queryFn:  () => contactService.getUnreadCount(),
    staleTime: 60 * 1000,
  });

  const counts = summary?.statusCounts || {};
  const totalRevenue = summary?.totalRevenue || 0;
  const recentOrders = recentData?.orders || [];
  const totalOrders  = Object.values(counts).reduce((s, v) => s + (v?.count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] tracking-[3px] uppercase text-[#c9a96e] font-medium mb-1">Overview</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">Admin Dashboard</h1>
      </div>

      {/* Revenue + order stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp}  label="Total Revenue"   value={loadingSummary ? "…" : formatPrice(totalRevenue)} color="bg-[#f0ebe3] text-[#c9a96e]" />
        <StatCard icon={Package}     label="Total Orders"    value={loadingSummary ? "…" : totalOrders}              color="bg-blue-50 text-blue-500"   to="/admin/orders" />
        <StatCard icon={Star}        label="Pending Reviews" value={pendingReviews ?? "…"}                           color="bg-amber-50 text-amber-500"  to="/admin/reviews" />
        <StatCard icon={MessageSquare} label="Unread Messages" value={unreadContacts ?? "…"}                         color="bg-green-50 text-green-500"  to="/admin/contacts" />
      </div>

      {/* Order status breakdown */}
      <div>
        <h2 className="font-serif text-xl text-[#1a1a1a] mb-4">Orders by Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const data = counts[status] || { count: 0 };
            return (
              <Link
                key={status}
                to={`/admin/orders?status=${status}`}
                className="bg-white border border-[#e8e0d4] p-4 text-center hover:border-[#1a1a1a] hover:shadow-sm transition-all group"
              >
                <p className="text-2xl font-serif font-semibold text-[#1a1a1a] group-hover:text-[#c9a96e] transition-colors">
                  {loadingSummary ? "…" : data.count}
                </p>
                <span className={`inline-block mt-2 text-[9px] tracking-[1.5px] uppercase font-bold px-2 py-0.5 ${cfg.badge}`}>
                  {cfg.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-[#1a1a1a]">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs text-[#c9a96e] hover:underline font-medium flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="bg-white border border-[#e8e0d4] overflow-hidden">
          {loadingRecent ? (
            <div className="divide-y divide-[#f0ebe3]">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="h-3 w-36 bg-[#ece8e0] rounded-full" />
                  <div className="h-5 w-20 bg-[#ece8e0] rounded-sm ml-auto" />
                  <div className="h-3 w-24 bg-[#ece8e0] rounded-full" />
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-10 text-center">
              <ShoppingBag size={26} className="mx-auto text-[#ccc] mb-3" />
              <p className="text-sm text-[#888]">No orders yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0ebe3]">
              {recentOrders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                return (
                  <Link
                    key={order._id}
                    to={`/admin/orders/${order._id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f9f7f4] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-[#1a1a1a] tracking-wide">
                          {order.orderNumber}
                        </span>
                        <span className={`text-[9px] tracking-[1.5px] uppercase font-bold px-2 py-0.5 ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#888] mt-0.5">
                        {order.user?.name || order.guestInfo?.name || "Guest"} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#1a1a1a] shrink-0">
                      {formatPrice(order.pricing?.total)}
                    </span>
                    <ArrowRight size={13} className="text-[#bbb] group-hover:text-[#c9a96e] group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Add Product",     icon: ShoppingBag,    to: "/admin/products/new",  color: "bg-[#1a1a1a] text-white hover:bg-[#c9a96e]" },
          { label: "All Products",    icon: Package,        to: "/admin/products",      color: "bg-white border border-[#e8e0d4] text-[#1a1a1a] hover:border-[#1a1a1a]" },
          { label: "Review Queue",    icon: Star,           to: "/admin/reviews",       color: "bg-white border border-[#e8e0d4] text-[#1a1a1a] hover:border-[#1a1a1a]" },
          { label: "Messages",        icon: MessageSquare,  to: "/admin/contacts",      color: "bg-white border border-[#e8e0d4] text-[#1a1a1a] hover:border-[#1a1a1a]" },
        ].map(({ label, icon: Icon, to, color }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center justify-center gap-2 py-3.5 text-xs tracking-[1.5px] uppercase font-bold transition-colors ${color}`}
          >
            <Icon size={14} />{label}
          </Link>
        ))}
      </div>
    </div>
  );
}