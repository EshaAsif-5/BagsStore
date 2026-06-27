import { create } from "zustand";
import { devtools } from "zustand/middleware";
import api from "../services/api.js";

// ─────────────────────────────────────────────
// AUTH STORE
//
// Responsibilities:
//   • Store authenticated user + role
//   • Expose login / register / logout actions
//   • Hydrate from server on app load (initAuth)
//   • Drive ProtectedRoute and AdminRoute guards
//
// NOT persisted to localStorage — auth state is
// sourced from the server's HTTP-only cookie on
// every app load via initAuth(). Persisting to
// localStorage would create a stale-user risk
// (e.g. deleted account still shows as logged in).
// ─────────────────────────────────────────────

const useAuthStore = create(
  devtools(
    (set, get) => ({
      // ─────────────────────────────────────────
      // STATE
      // ─────────────────────────────────────────

      /** Full user object returned from the API */
      user: null,

      /** Derived convenience flag */
      isAuthenticated: false,

      /**
       * True once initAuth() has completed (success or failure).
       * App.jsx waits for this before rendering routes — prevents
       * flash of login page for already-authenticated users.
       */
      authInitialised: false,

      /** True during any async auth operation */
      isLoading: false,

      /** Last auth error message — shown in login/register forms */
      error: null,

      // ─────────────────────────────────────────
      // INTERNAL HELPERS
      // ─────────────────────────────────────────

      /** Set loading state and clear previous error */
      _startLoading: () => set({ isLoading: true, error: null }),

      /** Set user as authenticated */
      _setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }),

      /** Clear all auth state */
      _clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      /** Store an error and stop loading */
      _setError: (error) => set({ error, isLoading: false }),

      // ─────────────────────────────────────────
      // ACTIONS
      // ─────────────────────────────────────────

      /**
       * initAuth — called once on App mount.
       * Hits GET /auth/me to validate the HTTP-only cookie.
       * Silently resolves as guest if cookie is absent/expired.
       */
      initAuth: async () => {
        try {
          const { data } = await api.get("/auth/me");
          get()._setUser(data.data.user);
        } catch {
          // Cookie absent, expired, or invalid — treat as guest, no error
          get()._clearUser();
        } finally {
          set({ authInitialised: true });
        }
      },

      /**
       * register — create a new customer account.
       * @param {{ name, email, phone, password }} payload
       * @returns {Object} user
       */
      register: async ({ name, email, phone, password }) => {
        get()._startLoading();
        try {
          const { data } = await api.post("/auth/register", {
            name,
            email,
            phone,
            password,
          });
          get()._setUser(data.data.user);
          return data.data.user;
        } catch (err) {
          const message =
            err.response?.data?.message || "Registration failed. Please try again.";
          get()._setError(message);
          throw new Error(message);
        }
      },

      /**
       * login — authenticate with email + password.
       * @param {{ email, password }} payload
       * @returns {Object} user
       */
      login: async ({ email, password }) => {
        get()._startLoading();
        try {
          const { data } = await api.post("/auth/login", { email, password });
          get()._setUser(data.data.user);
          return data.data.user;
        } catch (err) {
          const message =
            err.response?.data?.message || "Invalid email or password.";
          get()._setError(message);
          throw new Error(message);
        }
      },

      /**
       * logout — clear server session and local state.
       * Fires POST /auth/logout to clear the HTTP-only cookie.
       * Clears local auth state regardless of server response.
       */
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {
          // Server error on logout is non-fatal — clear local state anyway
        } finally {
          get()._clearUser();
        }
      },

      /**
       * updateUser — locally update the stored user object
       * after a profile edit without a full re-fetch.
       * @param {Partial<Object>} updates
       */
      updateUser: (updates) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...updates } });
      },

      /**
       * addAddressLocally — optimistically add an address
       * to the local user state after API success.
       * @param {Object} address
       */
      addAddressLocally: (address) => {
        const user = get().user;
        if (!user) return;
        set({
          user: {
            ...user,
            addresses: [...(user.addresses || []), address],
          },
        });
      },

      /**
       * updateAddressLocally — optimistically update an address.
       * @param {string} addressId
       * @param {Object} updates
       */
      updateAddressLocally: (addressId, updates) => {
        const user = get().user;
        if (!user) return;
        set({
          user: {
            ...user,
            addresses: user.addresses.map((a) =>
              a._id === addressId ? { ...a, ...updates } : a
            ),
          },
        });
      },

      /**
       * removeAddressLocally — optimistically remove an address.
       * @param {string} addressId
       */
      removeAddressLocally: (addressId) => {
        const user = get().user;
        if (!user) return;
        set({
          user: {
            ...user,
            addresses: user.addresses.filter((a) => a._id !== addressId),
          },
        });
      },

      /** Clear the error field — called when forms unmount or reset */
      clearError: () => set({ error: null }),
    }),
    { name: "ZEE_AuthStore" }
  )
);

export default useAuthStore;