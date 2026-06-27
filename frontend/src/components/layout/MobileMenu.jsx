import { useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  X,
  ShoppingBag,
  Heart,
  Package,
  User,
  LogOut,
  ChevronRight,
  Home,
  Phone,
  MapPin,
  MessageCircle,
} from "lucide-react";
import useAuthStore from "../../store/authStore.js";
import useCartStore from "../../store/cartStore.js";
import toast from "react-hot-toast";

const CATEGORIES = [
  { label: "University Bags", slug: "university" },
  { label: "Modern Bags", slug: "modern" },
  { label: "Luxury Bags", slug: "luxury" },
  { label: "Stylish Bags", slug: "stylish" },
];

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "923001234567";

export default function MobileMenu({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount);
  const panelRef = useRef(null);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Close when clicking outside the panel
  const handleBackdropClick = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/");
    toast.success("Logged out successfully.");
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center justify-between py-3.5 border-b border-[#f0ebe3] text-sm tracking-wide transition-colors ${
      isActive ? "text-[#c9a96e]" : "text-[#1a1a1a]"
    }`;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={`relative ml-auto w-[85vw] max-w-sm h-full bg-[#f9f7f4] flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e0d4]">
          <Link to="/" onClick={onClose} className="font-serif text-base tracking-[3px] text-[#1a1a1a] uppercase">
            ZEE.BY ZOHAIB
          </Link>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-[#666] hover:text-[#1a1a1a] transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* User greeting */}
          {isAuthenticated && user && (
            <div className="mb-4 pb-4 border-b border-[#e8e0d4]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                  <span className="text-white text-xs font-medium tracking-wide uppercase">
                    {user.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a] leading-tight">{user.name}</p>
                  <p className="text-xs text-[#888] mt-0.5 truncate max-w-[160px]">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Nav */}
          <nav className="mb-4">
            <NavLink to="/" onClick={onClose} className={navLinkClass} end>
              <span className="flex items-center gap-3">
                <Home size={16} className="text-[#c9a96e]" />
                Home
              </span>
              <ChevronRight size={14} className="text-[#bbb]" />
            </NavLink>

            {/* Shop / Categories */}
            <div className="py-3.5 border-b border-[#f0ebe3]">
              <p className="text-xs tracking-[2px] uppercase text-[#888] mb-3 font-medium">
                Shop
              </p>
              <div className="space-y-0.5 pl-1">
                <NavLink
                  to="/products"
                  onClick={onClose}
                  className={navLinkClass}
                >
                  <span>All Products</span>
                  <ChevronRight size={14} className="text-[#bbb]" />
                </NavLink>
                {CATEGORIES.map((cat) => (
                  <NavLink
                    key={cat.slug}
                    to={`/products?category=${cat.slug}`}
                    onClick={onClose}
                    className={navLinkClass}
                  >
                    <span>{cat.label}</span>
                    <ChevronRight size={14} className="text-[#bbb]" />
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Cart */}
            <NavLink
              to="/cart"
              onClick={onClose}
              className={navLinkClass}
            >
              <span className="flex items-center gap-3">
                <ShoppingBag size={16} className="text-[#c9a96e]" />
                Cart
              </span>
              <div className="flex items-center gap-2">
                {itemCount > 0 && (
                  <span className="bg-[#1a1a1a] text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium">
                    {itemCount}
                  </span>
                )}
                <ChevronRight size={14} className="text-[#bbb]" />
              </div>
            </NavLink>

            <NavLink to="/track-order" onClick={onClose} className={navLinkClass}>
              <span className="flex items-center gap-3">
                <Package size={16} className="text-[#c9a96e]" />
                Track Order
              </span>
              <ChevronRight size={14} className="text-[#bbb]" />
            </NavLink>

            <NavLink to="/contact" onClick={onClose} className={navLinkClass}>
              <span className="flex items-center gap-3">
                <Phone size={16} className="text-[#c9a96e]" />
                Contact
              </span>
              <ChevronRight size={14} className="text-[#bbb]" />
            </NavLink>
          </nav>

          {/* Account Section */}
          {isAuthenticated ? (
            <div className="mb-4">
              <p className="text-xs tracking-[2px] uppercase text-[#888] mb-3 font-medium">
                My Account
              </p>
              <div className="space-y-0.5">
                <NavLink to="/account" onClick={onClose} className={navLinkClass}>
                  <span className="flex items-center gap-3">
                    <User size={16} className="text-[#c9a96e]" />
                    Dashboard
                  </span>
                  <ChevronRight size={14} className="text-[#bbb]" />
                </NavLink>
                <NavLink to="/account/orders" onClick={onClose} className={navLinkClass}>
                  <span className="flex items-center gap-3">
                    <Package size={16} className="text-[#c9a96e]" />
                    My Orders
                  </span>
                  <ChevronRight size={14} className="text-[#bbb]" />
                </NavLink>
                <NavLink to="/account/wishlist" onClick={onClose} className={navLinkClass}>
                  <span className="flex items-center gap-3">
                    <Heart size={16} className="text-[#c9a96e]" />
                    Wishlist
                  </span>
                  <ChevronRight size={14} className="text-[#bbb]" />
                </NavLink>
                <NavLink to="/account/addresses" onClick={onClose} className={navLinkClass}>
                  <span className="flex items-center gap-3">
                    <MapPin size={16} className="text-[#c9a96e]" />
                    Addresses
                  </span>
                  <ChevronRight size={14} className="text-[#bbb]" />
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 py-3.5 border-b border-[#f0ebe3] text-sm tracking-wide text-red-500 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex flex-col gap-3">
              <Link
                to="/login"
                onClick={onClose}
                className="w-full bg-[#1a1a1a] text-white text-sm tracking-[1.5px] uppercase py-3 text-center font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="w-full border border-[#1a1a1a] text-[#1a1a1a] text-sm tracking-[1.5px] uppercase py-3 text-center font-medium"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>

        {/* Footer — WhatsApp */}
        <div className="px-5 py-4 border-t border-[#e8e0d4]">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I need help with ZEE.BY ZOHAIB.`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3 text-sm text-[#25D366] font-medium"
          >
            <MessageCircle size={18} />
            Chat with us on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}