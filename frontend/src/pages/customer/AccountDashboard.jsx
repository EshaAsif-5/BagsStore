import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Heart,
  MapPin,
  User,
  ArrowRight,
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
} from "lucide-react";
import useAuthStore from "../../store/authStore.js";
import orderService from "../../services/orderService.js";

const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const STATUS_CONFIG = {
  pending:    { label: "Pending",    color: "bg-amber-100 text-amber-700",  icon: Clock },
  confirmed:  { label: "Confirmed",  color: "bg-blue-100 text-blue-700",    icon: CheckCircle },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-700", icon: Package },
  shipped:    { label: "Shipped",    color: "bg-indigo-100 text-indigo-700", icon: Truck },
  delivered:  { label: "Delivered",  color: "bg-green-100 text-green-700",  icon: CheckCircle },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-700",      icon: Package },
};

function StatCard({ icon: Icon, label, value, to, color }) {
  return (
    <Link
      to={to}
      className="bg-white border border-[#e8e0d4] p-5 flex items-start gap-4 hover:border-[#1a1a1a] hover:shadow-sm transition-all group"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color} shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-serif font-semibold text-[#1a1a1a] leading-none">{value}</p>
        <p className="text-xs text-[#888] mt-1 tracking-wide">{label}</p>
      </div>
      <ArrowRight size={14} className="ml-auto text-[#bbb] group-hover:text-[#c9a96e] group-hover:translate-x-1 transition-all mt-1 shrink-0" />
    </Link>
  );
}

function QuickLink({ icon: Icon, label, desc, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-4 bg-white border border-[#e8e0d4] hover:border-[#1a1a1a] hover:shadow-sm transition-all group"
    >
      <div className="w-9 h-9 rounded-full bg-[#f0ebe3] flex items-center justify-center shrink-0 group-hover:bg-[#1a1a1a] transition-colors">
        <Icon size={16} className="text-[#c9a96e] group-hover:text-[#c9a96e]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1a1a1a]">{label}</p>
        <p className="text-xs text-[#888] mt-0.5">{desc}</p>
      </div>
      <ArrowRight size={14} className="text-[#bbb] group-hover:text-[#c9a96e] group-hover:translate-x-1 transition-all shrink-0" />
    </Link>
  );
}

export default function AccountDashboard() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["orders", "my", { page: 1, limit: 3 }],
    queryFn: () => orderService.getMyOrders({ page: 1, limit: 3 }),
    staleTime: 60 * 1000,
  });

  const orders = data?.orders || [];
  const total  = data?.total  || 0;

  const delivered = orders.filter((o) => o.status === "delivered").length;
  const pending   = orders.filter((o) => ["pending","confirmed","processing","shipped"].includes(o.status)).length;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] tracking-[3px] uppercase text-[#c9a96e] font-medium mb-1">
            Welcome back
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">
            {user?.name}
          </h1>
          <p className="text-sm text-[#888] mt-1">{user?.email}</p>
        </div>
        <Link
          to="/products"
          className="flex items-center gap-2 text-xs tracking-[1.5px] uppercase font-semibold bg-[#1a1a1a] text-white px-5 py-2.5 hover:bg-[#c9a96e] transition-colors"
        >
          <ShoppingBag size={13} /> Shop Now
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Package}    label="Total Orders"   value={isLoading ? "—" : total}     to="/account/orders"    color="bg-[#f0ebe3] text-[#c9a96e]" />
        <StatCard icon={Truck}      label="Active Orders"  value={isLoading ? "—" : pending}    to="/account/orders"    color="bg-blue-50 text-blue-500" />
        <StatCard icon={CheckCircle}label="Delivered"      value={isLoading ? "—" : delivered}  to="/account/orders"    color="bg-green-50 text-green-500" />
        <StatCard icon={Heart}      label="Wishlist Items" value={user?.wishlist?.length ?? 0}  to="/account/wishlist"  color="bg-pink-50 text-pink-500" />
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-[#1a1a1a]">Recent Orders</h2>
          <Link to="/account/orders" className="text-xs text-[#c9a96e] hover:underline font-medium flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white border border-[#e8e0d4] animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-[#e8e0d4] p-8 text-center">
            <ShoppingBag size={28} className="mx-auto text-[#ccc] mb-3" />
            <p className="text-sm text-[#888]">No orders yet.</p>
            <Link to="/products" className="mt-3 inline-block text-xs text-[#c9a96e] hover:underline font-medium">
              Start shopping →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              return (
                <Link
                  key={order._id}
                  to={`/account/orders/${order._id}`}
                  className="flex items-center gap-4 bg-white border border-[#e8e0d4] p-4 hover:border-[#1a1a1a] transition-colors group"
                >
                  <div className="shrink-0 w-10 h-10 bg-[#f4f1ec] flex items-center justify-center">
                    <StatusIcon size={16} className="text-[#888]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1a1a1a] font-mono tracking-wide">
                        {order.orderNumber}
                      </p>
                      <span className={`text-[10px] tracking-[1.5px] uppercase font-bold px-2 py-0.5 rounded-sm ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#888] mt-0.5">
                      {order.items?.length} item{order.items?.length !== 1 ? "s" : ""} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[#1a1a1a]">
                      {formatPrice(order.pricing?.total)}
                    </p>
                    <ArrowRight size={13} className="text-[#bbb] group-hover:text-[#c9a96e] group-hover:translate-x-1 transition-all mt-1 ml-auto" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="font-serif text-xl text-[#1a1a1a] mb-4">Account</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickLink icon={User}   label="My Profile"  desc="Update name, phone, password"    to="/account/profile" />
          <QuickLink icon={MapPin} label="Addresses"   desc="Manage delivery addresses"        to="/account/addresses" />
          <QuickLink icon={Heart}  label="Wishlist"    desc="Your saved products"              to="/account/wishlist" />
          <QuickLink icon={Package}label="Track Order" desc="Public order tracking"            to="/track-order" />
        </div>
      </div>
    </div>
  );
}