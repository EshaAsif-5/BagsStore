import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";

// ─────────────────────────────────────────────
// AXIOS INSTANCE
//
// Single shared Axios instance for all API calls.
// All cookies (including HTTP-only auth cookies)
// are sent automatically with every request via
// withCredentials: true.
//
// Interceptor responsibilities:
//   Request  → inject guestSessionId cookie header
//   Response → transparent 401 retry with token refresh
//              → normalise error shape for services
// ─────────────────────────────────────────────

const BASE_URL = env.apiBaseUrl;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // Send HTTP-only cookies (accessToken, refreshToken)
  timeout: 15000,          // 15s timeout — abort stalled requests
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─────────────────────────────────────────────
// TOKEN REFRESH STATE
// Prevents multiple concurrent refresh attempts
// when several requests fail with 401 simultaneously.
// ─────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];      // Requests waiting for the refresh to complete

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// ─────────────────────────────────────────────
// REQUEST INTERCEPTOR
// ─────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Inject guest session ID for guest cart resolution.
    // Create one on first request so guests can add to cart immediately.
    let guestSessionId = localStorage.getItem("zee_guest_session");
    if (!guestSessionId) {
      guestSessionId = uuidv4();
      localStorage.setItem("zee_guest_session", guestSessionId);
    }
    config.headers["x-guest-session-id"] = guestSessionId;

    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// RESPONSE INTERCEPTOR
// ─────────────────────────────────────────────
api.interceptors.response.use(
  // ── Success path — pass through unchanged ──
  (response) => response,

  // ── Error path ──────────────────────────────
  async (error) => {
    const originalRequest = error.config;

    // ── Network / timeout errors ──────────────
    if (!error.response) {
      return Promise.reject(
        normaliseError({
          message:
            "Cannot reach the server. Please check your internet connection.",
          statusCode: 0,
          isNetworkError: true,
        })
      );
    }

    const { status, data } = error.response;

    // ── 401 — attempt silent token refresh ────
    // Skip refresh for the refresh endpoint itself to prevent
    // an infinite retry loop.
    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh-token") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      // If a refresh is already in-flight, queue this request
      // and resolve/reject when the refresh completes.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to get a new access token using the refresh token cookie
        await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        // Refresh succeeded — replay all queued requests
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — session truly expired
        processQueue(refreshError);

        // Wipe local auth state without triggering a full re-render
        // (auth store import would create a circular dep — use event instead)
        window.dispatchEvent(new CustomEvent("zee:session-expired"));

        return Promise.reject(
          normaliseError({
            message: "Your session has expired. Please log in again.",
            statusCode: 401,
          })
        );
      } finally {
        isRefreshing = false;
      }
    }

    // ── All other errors — normalise and reject ──
    return Promise.reject(
      normaliseError({
        message: data?.message || getDefaultMessage(status),
        statusCode: status,
        errors: data?.errors || [],
        data,
      })
    );
  }
);

// ─────────────────────────────────────────────
// ERROR NORMALISER
// Creates a consistent error shape that all
// service functions and UI components can rely on.
// ─────────────────────────────────────────────
const normaliseError = ({ message, statusCode, errors = [], isNetworkError = false, data = null }) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errors = errors;          // Array of field-level validation messages
  err.isNetworkError = isNetworkError;
  err.responseData = data;
  return err;
};

const getDefaultMessage = (status) => {
  const messages = {
    400: "Invalid request. Please check your input.",
    401: "Authentication required. Please log in.",
    403: "You do not have permission to perform this action.",
    404: "The requested resource was not found.",
    409: "A conflict occurred. The resource may already exist.",
    422: "Validation failed. Please check your input.",
    429: "Too many requests. Please slow down and try again.",
    500: "An unexpected server error occurred. Please try again.",
    502: "Server is temporarily unavailable. Please try again shortly.",
    503: "Service unavailable. Please try again later.",
  };
  return messages[status] || "Something went wrong. Please try again.";
};

// ─────────────────────────────────────────────
// SESSION EXPIRED EVENT LISTENER
// Listens for the custom event dispatched by the
// interceptor when a refresh token fails.
// Clears Zustand auth store and redirects to login.
// Imported lazily to avoid circular dependency.
// ─────────────────────────────────────────────
window.addEventListener("zee:session-expired", async () => {
  // Dynamically import to avoid circular dependency:
  // api.js → authStore.js → api.js
  const { default: useAuthStore } = await import("../store/authStore.js");
  useAuthStore.getState()._clearUser();

  // Navigate to login only if not already there
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
});

export default api;