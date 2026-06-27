import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css";

// ─────────────────────────────────────────────
// TANSTACK QUERY CLIENT
// Global cache config — fine-tuned for an
// e-commerce catalog where product data changes
// infrequently but cart/order data must stay fresh.
// ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't re-fetch on every window focus — bad UX on mobile
      refetchOnWindowFocus: false,
      // Retry once on failure before showing error
      retry: 1,
      // 2 minute default stale time — products/catalog data
      staleTime: 2 * 60 * 1000,
      // Keep data in cache for 10 minutes after component unmounts
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      // Don't retry mutations — cart/order mutations should not auto-repeat
      retry: false,
    },
  },
});

const container = document.getElementById("root");

if (!container) {
  throw new Error(
    '[ZEE] Root element #root not found. Check your index.html.'
  );
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        {/* Global toast notifications — positioned top-right on desktop,
            top-center on mobile for thumb reach */}
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          containerStyle={{
            top: 16,
          }}
          toastOptions={{
            // Default duration
            duration: 4000,
            // Base style applied to all toasts
            style: {
              background: "#1a1a1a",
              color: "#ffffff",
              fontSize: "14px",
              fontFamily: "inherit",
              borderRadius: "6px",
              padding: "12px 16px",
              maxWidth: "380px",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#c9a96e",
                secondary: "#1a1a1a",
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#ffffff",
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
