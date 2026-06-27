import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore.js";

// ─────────────────────────────────────────────
// PROTECTED ROUTE
// Wraps any route that requires authentication.
// Unauthenticated users are redirected to /login
// with the intended destination stored in location
// state so they can be sent back after login.
//
// Usage in AppRouter:
//   <Route element={<ProtectedRoute />}>
//     <Route path="/account" element={<AccountDashboard />} />
//     <Route path="/account/orders" element={<MyOrders />} />
//   </Route>
// ─────────────────────────────────────────────
export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve the attempted URL so the login page can redirect back
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Authenticated — render the nested route's element
  return <Outlet />;
}
