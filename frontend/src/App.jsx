import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppRouter from "./routes/AppRouter.jsx";
import useAuthStore from "./store/authStore.js";

// ─────────────────────────────────────────────
// SCROLL RESTORATION
// React Router v6 does not restore scroll
// position on navigation by default.
// ─────────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

// ─────────────────────────────────────────────
// APP
// Initialises auth state from the server on
// first load (via /auth/me), then renders routes.
// ─────────────────────────────────────────────
export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);
  const authInitialised = useAuthStore((s) => s.authInitialised);

  // On mount: hit /auth/me to hydrate the auth store from
  // the HTTP-only cookie. If the cookie is expired or absent,
  // the user is silently treated as a guest.
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Render nothing until auth is initialised — prevents a flash
  // of the login page for already-authenticated users on protected routes.
  if (!authInitialised) {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Brand wordmark shown during initial auth check */}
          <p className="text-xl font-serif tracking-[4px] text-[#1a1a1a] uppercase">
            ZEE.BY ZOHAIB
          </p>
          {/* Animated loading bar */}
          <div className="w-48 h-0.5 bg-[#e5e0d8] overflow-hidden rounded-full">
            <div className="h-full bg-[#c9a96e] rounded-full animate-[loading_1.2s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <AppRouter />
    </>
  );
}
