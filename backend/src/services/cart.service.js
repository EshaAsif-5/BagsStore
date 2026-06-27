import { cartRepository } from "../repositories/cart.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import ApiError from "../utils/ApiError.js";

// ─────────────────────────────────────────────
// CART SERVICE
// Business logic for all cart operations.
// Supports both authenticated users and guests.
// ─────────────────────────────────────────────

/**
 * Resolve the correct cart based on auth state.
 * Authenticated  → user cart (MongoDB)
 * Guest          → session cart (MongoDB, TTL-indexed)
 *
 * @param {string|null} userId    - Authenticated user ID or null
 * @param {string|null} sessionId - Guest session cookie value or null
 * @returns {Cart} Populated cart document
 */
const resolveCart = async (userId, sessionId, populate = true) => {
  if (userId) {
    return populate
      ? cartRepository.findByUserId(userId)
      : cartRepository.findByUserIdRaw(userId);
  }
  if (sessionId) {
    return populate
      ? cartRepository.findBySessionId(sessionId)
      : cartRepository.findBySessionIdRaw(sessionId);
  }
  return null;
};

/**
 * Get the cart for a user or guest.
 * Returns a cart with populated product details and computed totals.
 * Filters out items whose products have been deactivated.
 */
const getCart = async (userId, sessionId) => {
  let cart = await resolveCart(userId, sessionId, true);

  if (!cart) {
    // Return an empty cart shape — no document created until first item added
    return {
      items: [],
      itemCount: 0,
      estimatedTotal: 0,
    };
  }

  // Strip items where product was deactivated or deleted
  const validItems = cart.items.filter(
    (item) => item.product && item.product.isActive !== false
  );

  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cartRepository.saveCart(cart);
  }

  return buildCartResponse(cart);
};

/**
 * Add an item to the cart, or increment quantity if it already exists.
 * Validates product + variant existence and stock availability.
 */
const addItem = async (userId, sessionId, { productId, variantId, quantity = 1 }) => {
  // 1. Validate product and variant
  const product = await productRepository.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found or is no longer available.");
  }

  const variant = product.variants.id(variantId);
  if (!variant) {
    throw new ApiError(404, "Product variant not found.");
  }

  // 2. Check stock availability
  if (variant.stock < quantity) {
    throw new ApiError(
      400,
      variant.stock === 0
        ? "This variant is currently out of stock."
        : `Only ${variant.stock} unit(s) available for this variant.`
    );
  }

  // 3. Get or create cart
  let cart;
  if (userId) {
    cart = await cartRepository.getOrCreateForUser(userId);
  } else if (sessionId) {
    cart = await cartRepository.getOrCreateForGuest(sessionId);
  } else {
    throw new ApiError(400, "Session ID is required for guest carts.");
  }

  // 4. Check if adding would exceed stock
  const existingItem = cart.items.find(
    (item) =>
      item.product.toString() === productId &&
      item.variantId.toString() === variantId
  );

  const currentQty = existingItem ? existingItem.quantity : 0;
  const newTotalQty = currentQty + quantity;

  if (newTotalQty > variant.stock) {
    throw new ApiError(
      400,
      `Cannot add ${quantity} more. Only ${variant.stock - currentQty} additional unit(s) available.`
    );
  }

  // 5. Mutate cart via model instance method
  cart.addItem(productId, variantId, quantity, variant.price);
  await cartRepository.saveCart(cart);

  // 6. Return populated cart
  const populated = await resolveCart(userId, sessionId, true);
  return buildCartResponse(populated);
};

/**
 * Update the quantity of a specific cart item.
 * Setting quantity to 0 removes the item.
 */
const updateItemQuantity = async (userId, sessionId, itemId, quantity) => {
  const cart = await resolveCart(userId, sessionId, false);
  if (!cart) {
    throw new ApiError(404, "Cart not found.");
  }

  const item = cart.items.id(itemId);
  if (!item) {
    throw new ApiError(404, "Item not found in cart.");
  }

  if (quantity <= 0) {
    // Treat quantity 0 as a remove request
    cart.removeItem(itemId);
    await cartRepository.saveCart(cart);

    const populated = await resolveCart(userId, sessionId, true);
    return populated ? buildCartResponse(populated) : emptyCartResponse();
  }

  // Validate stock for new quantity
  const product = await productRepository.findById(
    item.product.toString()
  );
  if (!product || !product.isActive) {
    throw new ApiError(404, "Product is no longer available.");
  }

  const variant = product.variants.id(item.variantId);
  if (!variant) {
    throw new ApiError(404, "Product variant no longer exists.");
  }

  if (quantity > variant.stock) {
    throw new ApiError(
      400,
      `Only ${variant.stock} unit(s) available for this variant.`
    );
  }

  // Update price snapshot in case it changed
  item.priceAtAdd = variant.price;
  cart.updateItemQuantity(itemId, quantity);
  await cartRepository.saveCart(cart);

  const populated = await resolveCart(userId, sessionId, true);
  return buildCartResponse(populated);
};

/**
 * Remove a single item from the cart by its item _id.
 */
const removeItem = async (userId, sessionId, itemId) => {
  const cart = await resolveCart(userId, sessionId, false);
  if (!cart) {
    throw new ApiError(404, "Cart not found.");
  }

  const itemExists = cart.items.some((i) => i._id.toString() === itemId);
  if (!itemExists) {
    throw new ApiError(404, "Item not found in cart.");
  }

  cart.removeItem(itemId);
  await cartRepository.saveCart(cart);

  const populated = await resolveCart(userId, sessionId, true);
  return populated ? buildCartResponse(populated) : emptyCartResponse();
};

/**
 * Clear all items from the cart.
 */
const clearCart = async (userId, sessionId) => {
  const cart = await resolveCart(userId, sessionId, false);
  if (!cart) {
    return emptyCartResponse();
  }

  await cartRepository.clearItems(cart._id);
  return emptyCartResponse();
};

/**
 * Merge a guest cart into an authenticated user's cart on login.
 * Guest cart is deleted after merging.
 * Called automatically at login time.
 */
const mergeGuestCart = async (userId, sessionId) => {
  if (!sessionId) return;

  const guestCart = await cartRepository.findBySessionIdRaw(sessionId);
  if (!guestCart || guestCart.items.length === 0) {
    // Nothing to merge — clean up empty guest cart if it exists
    if (guestCart) await cartRepository.deleteBySessionId(sessionId);
    return;
  }

  const userCart = await cartRepository.getOrCreateForUser(userId);

  // Validate each guest item before merging — filter out stale ones
  const validatedItems = [];
  for (const guestItem of guestCart.items) {
    const product = await productRepository.findById(
      guestItem.product.toString()
    );
    if (!product || !product.isActive) continue;

    const variant = product.variants.id(guestItem.variantId);
    if (!variant || variant.stock === 0) continue;

    // Cap quantity at available stock
    const safeQty = Math.min(guestItem.quantity, variant.stock);
    validatedItems.push({
      product: guestItem.product,
      variantId: guestItem.variantId,
      quantity: safeQty,
      priceAtAdd: variant.price, // Refresh price on merge
    });
  }

  // Merge validated guest items into user cart
  userCart.mergeWith(validatedItems);
  await cartRepository.saveCart(userCart);

  // Delete the guest cart
  await cartRepository.deleteBySessionId(sessionId);
};

// ─────────────────────────────────────────────
// RESPONSE BUILDERS
// ─────────────────────────────────────────────

/**
 * Build a clean, enriched cart response with variant details resolved.
 * Computes real-time total from current variant prices.
 */
const buildCartResponse = (cart) => {
  const enrichedItems = cart.items
    .map((item) => {
      const product = item.product;
      if (!product) return null;

      // Resolve current variant data from populated product
      const variant = product.variants?.find
        ? product.variants.find(
            (v) => v._id.toString() === item.variantId.toString()
          )
        : null;

      if (!variant) return null;

      // Use live price for total — priceAtAdd shown for reference
      const currentPrice = variant.price;

      return {
        _id: item._id,
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          category: product.category,
          image:
            product.images?.find((img) => img.isPrimary)?.url ||
            product.images?.[0]?.url ||
            null,
        },
        variant: {
          _id: variant._id,
          color: variant.color,
          colorHex: variant.colorHex,
          size: variant.size,
          price: currentPrice,
          comparePrice: variant.comparePrice,
          stock: variant.stock,
          sku: variant.sku,
        },
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
        currentPrice,
        priceChanged: item.priceAtAdd !== currentPrice,
        subtotal: currentPrice * item.quantity,
        addedAt: item.addedAt,
      };
    })
    .filter(Boolean); // Remove any null items (deleted/inactive products)

  const subtotal = enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    _id: cart._id,
    items: enrichedItems,
    itemCount,
    subtotal,
    estimatedTotal: subtotal, // Shipping calculated at checkout
  };
};

const emptyCartResponse = () => ({
  items: [],
  itemCount: 0,
  subtotal: 0,
  estimatedTotal: 0,
});

export const cartService = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  mergeGuestCart,
};