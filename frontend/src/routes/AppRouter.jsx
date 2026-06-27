import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import AdminRoute from "./AdminRoute.jsx";

// ─────────────────────────────────────────────
// LAZY-LOADED PAGE COMPONENTS
// Each page is a separate JS chunk — only loaded
// when the route is first visited. Reduces initial
// bundle size significantly.
// ─────────────────────────────────────────────

// ── Public Pages ──────────────────────────────
const HomePage             = lazy(() => import("../pages/public/HomePage.jsx"));
const CatalogPage          = lazy(() => import("../pages/public/CatalogPage.jsx"));
const ProductDetailPage    = lazy(() => import("../pages/public/ProductDetailPage.jsx"));
const CartPage             = lazy(() => import("../pages/public/CartPage.jsx"));
const CheckoutPage         = lazy(() => import("../pages/public/CheckoutPage.jsx"));
const OrderConfirmationPage= lazy(() => import("../pages/public/OrderConfirmationPage.jsx"));
const TrackOrderPage       = lazy(() => import("../pages/public/TrackOrderPage.jsx"));
const ContactPage          = lazy(() => import("../pages/public/ContactPage.jsx"));
const NotFoundPage         = lazy(() => import("../pages/public/NotFoundPage.jsx"));

// ── Auth Pages ────────────────────────────────
const LoginPage            = lazy(() => import("../pages/auth/LoginPage.jsx"));
const RegisterPage         = lazy(() => import("../pages/auth/RegisterPage.jsx"));

// ── Customer Account Pages ────────────────────
const AccountDashboard     = lazy(() => import("../pages/customer/AccountDashboard.jsx"));
const MyOrders             = lazy(() => import("../pages/customer/MyOrders.jsx"));
const OrderDetailPage      = lazy(() => import("../pages/customer/OrderDetailPage.jsx"));
const WishlistPage         = lazy(() => import("../pages/customer/WishlistPage.jsx"));
const ProfilePage          = lazy(() => import("../pages/customer/ProfilePage.jsx"));
const AddressesPage        = lazy(() => import("../pages/customer/AddressesPage.jsx"));

// ── Admin Pages ───────────────────────────────
const AdminDashboard       = lazy(() => import("../pages/admin/AdminDashboard.jsx"));
const ProductListPage      = lazy(() => import("../pages/admin/ProductListPage.jsx"));
const ProductFormPage      = lazy(() => import("../pages/admin/ProductFormPage.jsx"));
const OrderListPage        = lazy(() => import("../pages/admin/OrderListPage.jsx"));
const OrderDetailAdmin     = lazy(() => import("../pages/admin/OrderDetailAdmin.jsx"));
const ReviewModerationPage = lazy(() => import("../pages/admin/ReviewModerationPage.jsx"));
const ContactMessagesPage  = lazy(() => import("../pages/admin/ContactMessagesPage.jsx"));

// ── Layouts ───────────────────────────────────
// Layouts are NOT lazy — they are shell components
// that render immediately. Their children lazy-load.
import PublicLayout        from "../components/layout/PublicLayout.jsx";
import AdminLayout         from "../components/layout/AdminLayout.jsx";
import CustomerLayout      from "../components/layout/CustomerLayout.jsx";

// ─────────────────────────────────────────────
// PAGE LOADING FALLBACK
// Shown while a lazy page chunk is downloading.
// Full-screen, brand-consistent spinner.
// ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#e5e0d8] border-t-[#c9a96e] rounded-full animate-spin" />
        <p className="text-xs tracking-[2px] text-[#999] uppercase">Loading</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP ROUTER
// Route hierarchy:
//   PublicLayout  → public + auth pages
//   ProtectedRoute → customer account pages (CustomerLayout)
//   ProtectedRoute → AdminRoute → admin pages (AdminLayout)
// ─────────────────────────────────────────────
export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ══════════════════════════════════════
            PUBLIC ROUTES — wrapped in PublicLayout
            (Navbar + Footer + WhatsApp button)
            ══════════════════════════════════════ */}
        <Route element={<PublicLayout />}>

          {/* Home */}
          <Route index element={<HomePage />} />

          {/* Catalog */}
          <Route path="products" element={<CatalogPage />} />

          {/* Product Detail — slug-based URL */}
          <Route path="products/:slug" element={<ProductDetailPage />} />

          {/* Cart */}
          <Route path="cart" element={<CartPage />} />

          {/* Checkout — can be used by guest or auth user */}
          <Route path="checkout" element={<CheckoutPage />} />

          {/* Order Confirmation — shown after successful order placement */}
          <Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} />

          {/* Public Order Tracking — no auth required */}
          <Route path="track-order" element={<TrackOrderPage />} />

          {/* Contact */}
          <Route path="contact" element={<ContactPage />} />

          {/* Auth pages — inside PublicLayout (Navbar visible) */}
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

        </Route>

        {/* ══════════════════════════════════════
            CUSTOMER ACCOUNT ROUTES
            Requires: authenticated (any role)
            Layout: CustomerLayout (sidebar + account nav)
            ══════════════════════════════════════ */}
        <Route element={<ProtectedRoute />}>
          <Route element={<CustomerLayout />}>

            {/* /account → dashboard overview */}
            <Route path="account" element={<AccountDashboard />} />

            {/* /account/orders → order history list */}
            <Route path="account/orders" element={<MyOrders />} />

            {/* /account/orders/:id → single order detail */}
            <Route path="account/orders/:id" element={<OrderDetailPage />} />

            {/* /account/wishlist */}
            <Route path="account/wishlist" element={<WishlistPage />} />

            {/* /account/profile */}
            <Route path="account/profile" element={<ProfilePage />} />

            {/* /account/addresses */}
            <Route path="account/addresses" element={<AddressesPage />} />

          </Route>
        </Route>

        {/* ══════════════════════════════════════
            ADMIN ROUTES
            Requires: authenticated + role === "admin"
            Layout: AdminLayout (sidebar + top bar)
            ══════════════════════════════════════ */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>

              {/* /admin → dashboard with order summary + stats */}
              <Route path="admin" element={<AdminDashboard />} />

              {/* /admin/products → product list */}
              <Route path="admin/products" element={<ProductListPage />} />

              {/* /admin/products/new → create product form */}
              <Route path="admin/products/new" element={<ProductFormPage />} />

              {/* /admin/products/:id/edit → edit product form */}
              <Route path="admin/products/:id/edit" element={<ProductFormPage />} />

              {/* /admin/orders → all orders with filters */}
              <Route path="admin/orders" element={<OrderListPage />} />

              {/* /admin/orders/:id → order detail + status update */}
              <Route path="admin/orders/:id" element={<OrderDetailAdmin />} />

              {/* /admin/reviews → review moderation queue */}
              <Route path="admin/reviews" element={<ReviewModerationPage />} />

              {/* /admin/contacts → contact form messages */}
              <Route path="admin/contacts" element={<ContactMessagesPage />} />

            </Route>
          </Route>
        </Route>

        {/* ══════════════════════════════════════
            REDIRECTS & CATCH-ALL
            ══════════════════════════════════════ */}

        {/* Legacy redirect — /products?category=X already handled
            in CatalogPage via useSearchParams, but if someone
            navigates to /shop redirect them to /products */}
        <Route path="shop" element={<Navigate to="/products" replace />} />
        <Route path="shop/*" element={<Navigate to="/products" replace />} />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </Suspense>
  );
}
