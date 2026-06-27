import { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Heart,
  MapPin,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import WhatsAppButton from "../ui/WhatsAppButton.jsx";
import useAuthStore from "../../store/authStore.js";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  {
    to: "/account",
    icon: LayoutDashboard,
    label: "Dashboard",
    end: true,
  },
  {
    to: "/account/orders",
    icon: Package,
    label: "My Orders",
  },
  {
    to: "/account/wishlist",
    icon: Heart,
    label: "Wishlist",
  },
  {
    to: "/account/addresses",
    icon: MapPin,
    label: "Addresses",
  },
  {
    to: "/account/profile",
    icon: User,
    label: "Profile",
  },
];

export default function CustomerLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Logged out successfully.");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-sm text-sm transition-all duration-150 group ${
      isActive
        ? "bg-[#1a1a1a] text-white"
        : "text-[#555] hover:bg-[#f0ebe3] hover:text-[#1a1a1a]"
    }`;

  const SidebarContent = () => (
    <>
      {/* User summary */}
      <div className="px-4 py-5 border-b border-[#e8e0d4]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold uppercase">
              {user?.name?.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1a1a1a] truncate">
              {user?.name}
            </p>
            <p className="text-[11px] text-[#888] truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="px-3 py-4 flex-1">
        <p className="text-[10px] tracking-[2px] uppercase text-[#aaa] font-medium px-1 mb-3">
          Account
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={linkClass}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={16} className="shrink-0" />
                <span>{label}</span>
                <ChevronRight
                  size={13}
                  className="ml-auto opacity-30 group-hover:opacity-70 transition-opacity"
                />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-[#e8e0d4] space-y-1">
        <Link
          to="/products"
          className="flex items-center gap-3 px-4 py-3 rounded-sm text-sm text-[#555] hover:bg-[#f0ebe3] hover:text-[#1a1a1a] transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          Continue Shopping
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f7f4]">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-10">

        {/* Mobile: sidebar toggle */}
        <div className="lg:hidden mb-5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a] border border-[#ddd] px-4 py-2.5 rounded-sm hover:border-[#1a1a1a] transition-colors"
          >
            <Menu size={16} />
            My Account
          </button>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 flex lg:hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSidebarOpen(false);
            }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-72 max-w-[85vw] bg-[#f9f7f4] h-full flex flex-col shadow-xl">
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-[#666] hover:text-[#1a1a1a]"
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Desktop layout */}
        <div className="flex gap-8 lg:gap-10">

          {/* Desktop sidebar */}
          <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 bg-white border border-[#e8e0d4] rounded-sm self-start sticky top-24">
            <SidebarContent />
          </aside>

          {/* Page content */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}