import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  Package,
  LogOut,
  Settings,
  ChevronDown,
  X,
} from "lucide-react";
import useAuthStore from "../../store/authStore.js";
import useCartStore from "../../store/cartStore.js";
import useWishlistStore from "../../store/wishlistStore.js";
import MobileMenu from "./MobileMenu.jsx";
import toast from "react-hot-toast";
import { env } from "../../config/env.js";

const CATEGORIES = [
  { label: "University", slug: "university" },
  { label: "Modern", slug: "modern" },
  { label: "Luxury", slug: "luxury" },
  { label: "Stylish", slug: "stylish" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount);
  const wishlistCount = useWishlistStore((s) =>
    s.getCount(isAuthenticated)
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        document.getElementById("navbar-search")?.focus();
      }, 100);
    }
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
    navigate("/");
    toast.success("Logged out successfully.");
  };

  const activeLinkClass =
    "text-[#c9a96e] border-b border-[#c9a96e] pb-0.5";
  const inactiveLinkClass =
    "text-[#1a1a1a] hover:text-[#c9a96e] transition-colors duration-200";

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-[#f9f7f4] transition-shadow duration-200 ${
          scrolled ? "shadow-[0_1px_12px_rgba(0,0,0,0.08)]" : ""
        }`}
      >
        {/* Announcement bar */}
        <div className="bg-[#1a1a1a] text-center py-2 px-4">
          <p className="text-[#c9a96e] text-[11px] tracking-[2.5px] uppercase font-medium">
            Free delivery on orders over PKR {env.shippingFreeThreshold.toLocaleString("en-PK")} · Pakistan Only
          </p>
        </div>

        {/* Main navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[70px]">

            {/* Left — hamburger (mobile) + category nav (desktop) */}
            <div className="flex items-center gap-6">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 text-[#1a1a1a] hover:text-[#c9a96e] transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu size={22} />
              </button>

              {/* Desktop category links */}
              <nav className="hidden lg:flex items-center gap-7">
                <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    `text-xs tracking-[1.5px] uppercase font-medium ${
                      isActive ? activeLinkClass : inactiveLinkClass
                    }`
                  }
                  end
                >
                  All
                </NavLink>
                {CATEGORIES.map((cat) => (
                  <NavLink
                    key={cat.slug}
                    to={`/products?category=${cat.slug}`}
                    className={({ isActive }) =>
                      `text-xs tracking-[1.5px] uppercase font-medium ${
                        isActive ? activeLinkClass : inactiveLinkClass
                      }`
                    }
                  >
                    {cat.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Centre — Brand wordmark */}
            <Link
              to="/"
              className="absolute left-1/2 -translate-x-1/2 font-serif text-[15px] sm:text-[17px] tracking-[4px] text-[#1a1a1a] uppercase whitespace-nowrap hover:text-[#c9a96e] transition-colors duration-200"
            >
              ZEE.BY ZUNAISHA
            </Link>

            {/* Right — icons */}
            <div className="flex items-center gap-1 sm:gap-2">

              {/* Search */}
              <button
                onClick={() => setSearchOpen((p) => !p)}
                className="p-2 text-[#1a1a1a] hover:text-[#c9a96e] transition-colors"
                aria-label="Search products"
              >
                <Search size={20} />
              </button>

              {/* Wishlist */}
              <Link
                to={isAuthenticated ? "/account/wishlist" : "/login"}
                className="relative p-2 text-[#1a1a1a] hover:text-[#c9a96e] transition-colors"
                aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ""}`}
              >
                <Heart size={20} />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-[#c9a96e] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 text-[#1a1a1a] hover:text-[#c9a96e] transition-colors"
                aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
              >
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-[#1a1a1a] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>

              {/* User / Account */}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen((p) => !p)}
                    className="flex items-center gap-1.5 p-2 text-[#1a1a1a] hover:text-[#c9a96e] transition-colors"
                    aria-label="Account menu"
                    aria-expanded={userDropdownOpen}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                      <span className="text-white text-[10px] font-semibold uppercase">
                        {user?.name?.charAt(0)}
                      </span>
                    </div>
                    <ChevronDown
                      size={12}
                      className={`hidden sm:block transition-transform duration-200 ${
                        userDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white shadow-lg border border-[#f0ebe3] rounded-sm z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#f0ebe3]">
                        <p className="text-xs font-semibold text-[#1a1a1a] truncate">{user?.name}</p>
                        <p className="text-[11px] text-[#888] truncate mt-0.5">{user?.email}</p>
                      </div>
                      <nav className="py-1">
                        {[
                          { to: "/account", icon: User, label: "My Account" },
                          { to: "/account/orders", icon: Package, label: "My Orders" },
                          { to: "/account/wishlist", icon: Heart, label: "Wishlist" },
                          ...(user?.role === "admin"
                            ? [{ to: "/admin", icon: Settings, label: "Admin Panel" }]
                            : []),
                        ].map(({ to, icon: Icon, label }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#333] hover:bg-[#f9f7f4] hover:text-[#c9a96e] transition-colors"
                          >
                            <Icon size={14} />
                            {label}
                          </Link>
                        ))}
                        <hr className="my-1 border-[#f0ebe3]" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={14} />
                          Sign Out
                        </button>
                      </nav>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-1.5 p-2 text-[#1a1a1a] hover:text-[#c9a96e] transition-colors"
                  aria-label="Sign in"
                >
                  <User size={20} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Search bar — expands below navbar */}
        {searchOpen && (
          <div
            ref={searchRef}
            className="border-t border-[#e8e0d4] bg-[#f9f7f4] px-4 sm:px-6 lg:px-8 py-3"
          >
            <form
              onSubmit={handleSearch}
              className="max-w-2xl mx-auto flex items-center gap-3"
            >
              <Search size={16} className="text-[#888] shrink-0" />
              <input
                id="navbar-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bags — university, luxury, modern..."
                className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[#aaa] hover:text-[#333]"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                className="text-xs tracking-[1.5px] uppercase font-medium text-[#c9a96e] hover:text-[#1a1a1a] transition-colors shrink-0"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile slide-in menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}