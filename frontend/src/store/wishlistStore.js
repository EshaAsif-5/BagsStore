import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import api from "../services/api.js";

// ─────────────────────────────────────────────
// WISHLIST STORE
//
// Architecture:
//   Auth users  → wishlist synced with server (/wishlist).
//                 Server is source of truth.
//                 Local state is optimistically updated.
//
//   Guest users → wishlist stored in localStorage only
//                 (server wishlist requires auth).
//                 On login, guest wishlist is migrated
//                 to the server via migrateGuestWishlist().
//
// Persisted: productIds[], guestProductIds[]
// NOT persisted: fullProducts[], isLoading, error
// ─────────────────────────────────────────────

const useWishlistStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ─────────────────────────────────────
        // STATE
        // ─────────────────────────────────────

        /**
         * Array of product IDs in the wishlist (authenticated user).
         * Kept lean — only IDs, not full product objects.
         * Full product data is fetched by WishlistPage via TanStack Query.
         */
        productIds: [],

        /**
         * Guest wishlist — product IDs stored locally until login.
         * Migrated to server on login via migrateGuestWishlist().
         */
        guestProductIds: [],

        /** True during any wishlist API call */
        isLoading: false,

        /** Last wishlist error */
        error: null,

        // ─────────────────────────────────────
        // INTERNAL HELPERS
        // ─────────────────────────────────────

        _startLoading: () => set({ isLoading: true, error: null }),
        _stopLoading: () => set({ isLoading: false }),
        _setError: (error) => set({ error, isLoading: false }),

        // ─────────────────────────────────────
        // SELECTORS
        // ─────────────────────────────────────

        /**
         * Check if a product is in the wishlist.
         * Works for both guests (guestProductIds) and auth users (productIds).
         *
         * @param {string} productId
         * @param {boolean} isAuthenticated
         */
        isWishlisted: (productId, isAuthenticated = false) => {
          const ids = isAuthenticated
            ? get().productIds
            : get().guestProductIds;
          return ids.includes(productId);
        },

        /** Total count — used for UI badges */
        getCount: (isAuthenticated = false) => {
          return isAuthenticated
            ? get().productIds.length
            : get().guestProductIds.length;
        },

        // ─────────────────────────────────────
        // ACTIONS — AUTHENTICATED USERS
        // ─────────────────────────────────────

        /**
         * fetchWishlist — load wishlist IDs from the server.
         * Called on login and WishlistPage mount.
         * Extracts only IDs from populated product objects.
         */
        fetchWishlist: async () => {
          get()._startLoading();
          try {
            const { data } = await api.get("/wishlist");
            const ids = (data.data.wishlist || []).map(
              (p) => p._id || p
            );
            set({ productIds: ids, isLoading: false });
          } catch (err) {
            get()._setError(
              err.response?.data?.message || "Could not load wishlist."
            );
          }
        },

        /**
         * addToWishlist — add a product for an authenticated user.
         * Optimistically updates local IDs, syncs with server.
         *
         * @param {string} productId
         */
        addToWishlist: async (productId) => {
          // Optimistic add
          set((state) => ({
            productIds: state.productIds.includes(productId)
              ? state.productIds
              : [...state.productIds, productId],
            isLoading: true,
          }));

          try {
            await api.post(`/wishlist/${productId}`);
            set({ isLoading: false });
          } catch (err) {
            // Revert optimistic add
            set((state) => ({
              productIds: state.productIds.filter((id) => id !== productId),
              isLoading: false,
            }));
            const message =
              err.response?.data?.message || "Could not add to wishlist.";
            get()._setError(message);
            throw new Error(message);
          }
        },

        /**
         * removeFromWishlist — remove a product for an authenticated user.
         * Optimistically removes from local IDs, syncs with server.
         *
         * @param {string} productId
         */
        removeFromWishlist: async (productId) => {
          const prev = get().productIds;

          // Optimistic remove
          set({
            productIds: prev.filter((id) => id !== productId),
            isLoading: true,
          });

          try {
            await api.delete(`/wishlist/${productId}`);
            set({ isLoading: false });
          } catch (err) {
            // Revert
            set({ productIds: prev, isLoading: false });
            const message =
              err.response?.data?.message || "Could not remove from wishlist.";
            get()._setError(message);
            throw new Error(message);
          }
        },

        /**
         * toggleWishlist — add or remove based on current state.
         * Returns the action taken: "added" | "removed".
         *
         * @param {string} productId
         * @param {boolean} isAuthenticated
         */
        toggleWishlist: async (productId, isAuthenticated = false) => {
          if (!isAuthenticated) {
            return get()._toggleGuestWishlist(productId);
          }

          const alreadyIn = get().productIds.includes(productId);
          if (alreadyIn) {
            await get().removeFromWishlist(productId);
            return "removed";
          } else {
            await get().addToWishlist(productId);
            return "added";
          }
        },

        // ─────────────────────────────────────
        // ACTIONS — GUEST USERS
        // ─────────────────────────────────────

        /**
         * _toggleGuestWishlist — add/remove from guest local wishlist.
         * No API call — purely localStorage via Zustand persist.
         *
         * @param {string} productId
         */
        _toggleGuestWishlist: (productId) => {
          const current = get().guestProductIds;
          const isIn = current.includes(productId);

          set({
            guestProductIds: isIn
              ? current.filter((id) => id !== productId)
              : [...current, productId],
          });

          return isIn ? "removed" : "added";
        },

        /**
         * addToGuestWishlist — add a product to guest wishlist.
         * @param {string} productId
         */
        addToGuestWishlist: (productId) => {
          set((state) => ({
            guestProductIds: state.guestProductIds.includes(productId)
              ? state.guestProductIds
              : [...state.guestProductIds, productId],
          }));
        },

        /**
         * removeFromGuestWishlist — remove from guest wishlist.
         * @param {string} productId
         */
        removeFromGuestWishlist: (productId) => {
          set((state) => ({
            guestProductIds: state.guestProductIds.filter(
              (id) => id !== productId
            ),
          }));
        },

        // ─────────────────────────────────────
        // MIGRATION
        // ─────────────────────────────────────

        /**
         * migrateGuestWishlist — called immediately after login.
         * Adds all guest wishlist items to the server one by one.
         * Failures on individual items are silently skipped —
         * a product may have been deactivated since it was wishlisted.
         * Guest wishlist is cleared after migration regardless.
         */
        migrateGuestWishlist: async () => {
          const guestIds = get().guestProductIds;
          if (guestIds.length === 0) return;

          // Fire all migrations concurrently
          const results = await Promise.allSettled(
            guestIds.map((productId) =>
              api.post(`/wishlist/${productId}`).catch(() => null)
            )
          );

          const successfulIds = guestIds.filter(
            (_, idx) => results[idx].status === "fulfilled"
          );

          // Add successfully migrated IDs to the authenticated wishlist
          set((state) => {
            const merged = [...new Set([...state.productIds, ...successfulIds])];
            return {
              productIds: merged,
              guestProductIds: [], // Clear guest list after migration
            };
          });
        },

        // ─────────────────────────────────────
        // CLEANUP
        // ─────────────────────────────────────

        /**
         * clearWishlist — wipe local wishlist state on logout.
         * Does NOT clear guest wishlist — persisted for next visit.
         * Server wishlist is preserved under the user account.
         */
        clearWishlist: () => {
          set({ productIds: [], isLoading: false, error: null });
        },

        /** Clear the error field */
        clearError: () => set({ error: null }),
      }),
      {
        name: "zee_wishlist",
        storage: createJSONStorage(() => localStorage),
        // Persist product IDs and guest IDs — never loading/error state
        partialize: (state) => ({
          productIds: state.productIds,
          guestProductIds: state.guestProductIds,
        }),
      }
    ),
    { name: "ZEE_WishlistStore" }
  )
);

export default useWishlistStore;