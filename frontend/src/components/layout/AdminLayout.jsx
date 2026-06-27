import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Star,
  MessageSquare,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import useAuthStore from "../../store/authStore.js";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/products", icon: ShoppingBag, label: "Products" },
  { to: "/admin/orders", icon: Package, label: "Orders" },
  { to: "/admin/reviews", icon: Star, label: "Reviews" },
  { to: "/admin/contacts", icon: MessageSquare, label: "Messages" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Logged out.");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 text-sm transition-colors rounded-sm ${
      isActive
        ? "bg-[#c9a96e] text-[#1a1a1a] font-medium"
        : "text-[#d4cdc2] hover:bg-[#252525] hover:text-white"
    }`;

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[#2a2a2a]">
        <Link to="/" className="block">
          <p className="font-serif text-[13px] tracking-[3px] text-white uppercase">ZEE.BY ZOHAIB</p>
          <p className="text-[9px] tracking-[2px] text-[#c9a96e] uppercase mt-0.5">Admin Panel</p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4">
        <p className="text-[9px] tracking-[2px] uppercase text-[#444] font-medium px-2 mb-3">
          Management
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={linkClass} onClick={() => setSidebarOpen(false)}>
                <Icon size={16} className="shrink-0" />
                <span>{label}</span>
                <ChevronRight size={12} className="ml-auto opacity-30" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#c9a96e] flex items-center justify-center">
            <span className="text-[#1a1a1a] text-xs font-bold uppercase">{user?.name?.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white truncate font-medium">{user?.name}</p>
            <p className="text-[10px] text-[#666] truncate">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#888] hover:text-red-400 hover:bg-[#252525] rounded-sm transition-colors"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#f4f1ec]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0 min-h-screen sticky top-0 max-h-screen overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" onClick={(e) => { if (e.target === e.currentTarget) setSidebarOpen(false); }}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-60 h-full">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-3 text-[#888] hover:text-white z-10">
              <X size={18} />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — mobile */}
        <header className="lg:hidden bg-[#1a1a1a] px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-[#888] hover:text-white" aria-label="Open sidebar">
            <Menu size={20} />
          </button>
          <p className="font-serif text-sm tracking-[3px] text-white uppercase">ZEE.BY ZOHAIB</p>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}