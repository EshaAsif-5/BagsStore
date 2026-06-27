import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore.js";

// ─────────────────────────────────────────────
// ADMIN ROUTE
// Two-layer guard:
//   1. If not authenticated → redirect to /login
//   2. If authenticated but not admin → redirect to /
//      (404 redirect leaks the existence of admin panel)
//
// Always nested INSIDE ProtectedRoute in the router
// so the auth check runs first. AdminRoute adds the
// role check on top.
//
// Usage in AppRouter:
//   <Route element={<ProtectedRoute />}>
//     <Route element={<AdminRoute />}>
//       <Route path="/admin" element={<AdminDashboard />} />
//     </Route>
//   </Route>
// ─────────────────────────────────────────────
export default function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  // Not authenticated — send to login with return path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but wrong role — silently redirect home.
  // Do NOT redirect to /403 or /unauthorized — that confirms
  // the admin panel exists, which is an information leak.
  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
