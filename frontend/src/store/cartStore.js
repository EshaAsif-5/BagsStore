import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import api from "../services/api.js";

// ─────────────────────────────────────────────
// CART STORE
//
// Architecture:
//   Guest users   → cart state persisted in localStorage.
//                   sessionId cookie set for server-side
//                   guest cart sync at checkout / on login.
//   Auth users    → cart fetched from server on login.
//                   localStorage cleared after merge.
//
// The server is always the source of truth at checkout.
// Client state drives the UI; stock/price are re-validated
// server-side when the order is placed.
//
// Persisted fields: items, sessionId, itemCount, subtotal
// NOT persisted:    isLoading, error
// ─────────────────────────────────────────────

// ── Guest Session ID ─────────────────────────
// Generated once, stored in localStorage alongside cart.
// Sent as a cookie by the Axios interceptor so the server
// can resolve the guest cart (see services/api.js).
const getOrCreateSessionId = () => {
  const existing = localStorage.getItem("zee_guest_session");
  if (existing) return existing;
  const id = uuidv4();
  localStorage.setItem("zee_guest_session", id);
  return id;
};

// ── Computed totals helper ───────────────────
const computeTotals = (items) => {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce(
    (sum, i) => sum + (i.variant?.price ?? i.currentPrice ?? 0) * i.quantity,
    0
  );
  return { itemCount, subtotal };
};

const useCartStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ─────────────────────────────────────
        // STATE
        // ─────────────────────────────────────

        /**
         * Cart items — shape mirrors the server's buildCartResponse:
         * [{
         *   _id, product: { _id, name, slug, image, category },
         *   variant: { _id, color, colorHex, size, price, comparePrice, stock, sku },
         *   quantity, currentPrice, priceAtAdd, priceChanged, subtotal, addedAt
         * }]
         */
        items: [],

        /** Derived — total number of units across all items */
        itemCount: 0,

        /** Derived — sum of (currentPrice × quantity) for all items */
        subtotal: 0,

        /**
         * Guest session ID — sent with every cart request so the
         * server can find/create the guest cart by sessionId.
         */
        sessionId: null,

        /** True during any cart API call */
        isLoading: false,

        /** Last cart error — shown in CartPage / CartDrawer */
        error: null,

        // ─────────────────────────────────────
        // INTERNAL HELPERS
        // ─────────────────────────────────────

        _startLoading: () => set({ isLoading: true, error: null }),

        _setCart: (cart) => {
          const { itemCount, subtotal } = computeTotals(cart.items ?? []);
          set({
            items: cart.items ?? [],
            itemCount: cart.itemCount ?? itemCount,
            subtotal: cart.subtotal ?? subtotal,
            isLoading: false,
            error: null,
          });
        },

        _setError: (error) => set({ error, isLoading: false }),

        // ─────────────────────────────────────
        // SESSION MANAGEMENT
        // ─────────────────────────────────────

        /**
         * initSession — ensure a sessionId exists for guests.
         * Called on CartPage / ProductDetail mount.
         */
        initSession: () => {
          if (!get().sessionId) {
            const id = getOrCreateSessionId();
            set({ sessionId: id });
          }
        },

        // ─────────────────────────────────────
        // ACTIONS — SERVER SYNC
        // ─────────────────────────────────────

        /**
         * fetchCart — pull the current cart from the server.
         * Called on page load for auth users and after login.
         */
        fetchCart: async () => {
          get()._startLoading();
          try {
            const { data } = await api.get("/cart");
            get()._setCart(data.data.cart);
          } catch (err) {
            get()._setError(
              err.message || err.response?.data?.message || "Could not load cart."
            );
          }
        },

        /**
         * addItem — add a product variant to the cart.
         * Optimistically updates local state, then syncs with server.
         *
         * @param {{ productId, variantId, quantity, productSnapshot }} payload
         *   productSnapshot — { name, slug, image, category, variant } for
         *   immediate UI feedback before server responds.
         */
        addItem: async ({ productId, variantId, quantity = 1, productSnapshot }) => {
          get()._startLoading();

          // Optimistic update — show item immediately
          if (productSnapshot) {
            const current = get().items;
            const existingIdx = current.findIndex(
              (i) =>
                i.product._id === productId &&
                i.variant._id === variantId
            );

            let optimisticItems;
            if (existingIdx > -1) {
              optimisticItems = current.map((item, idx) =>
                idx === existingIdx
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              );
            } else {
              optimisticItems = [
                ...current,
                {
                  _id: `temp_${Date.now()}`,
                  product: productSnapshot.product,
                  variant: productSnapshot.variant,
                  quantity,
                  currentPrice: productSnapshot.variant.price,
                  priceAtAdd: productSnapshot.variant.price,
                  subtotal: productSnapshot.variant.price * quantity,
                },
              ];
            }

            const { itemCount, subtotal } = computeTotals(optimisticItems);
            set({ items: optimisticItems, itemCount, subtotal });
          }

          try {
            const { data } = await api.post("/cart/items", {
              productId,
              variantId,
              quantity,
            });
            // Server response replaces optimistic state — prices verified
            get()._setCart(data.data.cart);
          } catch (err) {
            // Revert optimistic update on failure by re-fetching
            await get().fetchCart();
            const message =
              err.message ||
              err.response?.data?.message ||
              "Could not add item to cart.";
            get()._setError(message);
            throw new Error(message);
          }
        },

        /**
         * updateQuantity — change quantity of a cart item.
         * Quantity 0 removes the item (handled server-side).
         *
         * @param {string} itemId
         * @param {number} quantity
         */
        updateQuantity: async (itemId, quantity) => {
          // Optimistic local update
          const prev = get().items;
          const optimistic =
            quantity <= 0
              ? prev.filter((i) => i._id !== itemId)
              : prev.map((i) =>
                  i._id === itemId ? { ...i, quantity } : i
                );

          const { itemCount, subtotal } = computeTotals(optimistic);
          set({ items: optimistic, itemCount, subtotal, isLoading: true });

          try {
            const { data } = await api.put(`/cart/items/${itemId}`, {
              quantity,
            });
            get()._setCart(data.data.cart);
          } catch (err) {
            // Revert
            const { itemCount, subtotal } = computeTotals(prev);
            set({ items: prev, itemCount, subtotal, isLoading: false });
            const message =
              err.response?.data?.message || "Could not update quantity.";
            get()._setError(message);
            throw new Error(message);
          }
        },

        /**
         * removeItem — remove a specific cart item.
         * @param {string} itemId
         */
        removeItem: async (itemId) => {
          const prev = get().items;

          // Optimistic removal
          const optimistic = prev.filter((i) => i._id !== itemId);
          const { itemCount, subtotal } = computeTotals(optimistic);
          set({ items: optimistic, itemCount, subtotal, isLoading: true });

          try {
            const { data } = await api.delete(`/cart/items/${itemId}`);
            get()._setCart(data.data.cart);
          } catch (err) {
            // Revert
            const { itemCount, subtotal } = computeTotals(prev);
            set({ items: prev, itemCount, subtotal, isLoading: false });
            const message =
              err.response?.data?.message || "Could not remove item.";
            get()._setError(message);
            throw new Error(message);
          }
        },

        /**
         * clearCart — empty all items in the cart.
         * Called after successful order placement.
         */
        clearCart: async () => {
          set({ items: [], itemCount: 0, subtotal: 0, isLoading: true });
          try {
            await api.delete("/cart");
            set({ isLoading: false });
          } catch {
            // Non-critical — local state is already cleared
            set({ isLoading: false });
          }
        },

        /**
         * mergeGuestCart — called immediately after login.
         * Sends the guest sessionId to the server to merge carts,
         * then fetches the merged cart and clears guest session data.
         */
        mergeGuestCart: async () => {
          const sessionId = get().sessionId;
          if (!sessionId) return;

          try {
            const { data } = await api.post("/cart/merge");
            get()._setCart(data.data.cart);
          } catch {
            // Merge failure is non-critical — user cart is still intact
          } finally {
            // Clean up guest session regardless of merge outcome
            localStorage.removeItem("zee_guest_session");
            set({ sessionId: null });
          }
        },

        /**
         * clearLocalCart — used on logout to wipe local cart state.
         * Does not call the server — the server cart persists under the user account.
         */
        clearLocalCart: () => {
          set({ items: [], itemCount: 0, subtotal: 0, error: null });
        },

        // ─────────────────────────────────────
        // SELECTORS
        // ─────────────────────────────────────

        /** Returns true if a specific variant is in the cart */
        isInCart: (productId, variantId) => {
          return get().items.some(
            (i) =>
              i.product?._id === productId &&
              i.variant?._id === variantId
          );
        },

        /** Returns the quantity of a specific variant in the cart */
        getItemQuantity: (productId, variantId) => {
          const item = get().items.find(
            (i) =>
              i.product?._id === productId &&
              i.variant?._id === variantId
          );
          return item?.quantity ?? 0;
        },

        /** Clear the error field */
        clearError: () => set({ error: null }),
      }),
      {
        name: "zee_cart",
        storage: createJSONStorage(() => localStorage),
        // Only persist these fields — never persist loading/error state
        partialize: (state) => ({
          items: state.items,
          itemCount: state.itemCount,
          subtotal: state.subtotal,
          sessionId: state.sessionId,
        }),
      }
    ),
    { name: "ZEE_CartStore" }
  )
);

export default useCartStore;