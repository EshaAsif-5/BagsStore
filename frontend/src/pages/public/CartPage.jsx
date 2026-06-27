import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Package,
  Tag,
  MessageCircle,
} from "lucide-react";
import useCartStore from "../../store/cartStore.js";
import useAuthStore from "../../store/authStore.js";
import toast from "react-hot-toast";
import { env } from "../../config/env.js";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const SHIPPING_THRESHOLD = env.shippingFreeThreshold;
const SHIPPING_FEE = env.shippingFeeStandard;

const WHATSAPP = env.whatsappNumber;

// ─────────────────────────────────────────────
// CART ITEM ROW
// ─────────────────────────────────────────────
function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCartStore();
  const [updating, setUpdating] = useState(false);

  const handleQtyChange = async (newQty) => {
    if (updating) return;
    setUpdating(true);
    try {
      await updateQuantity(item._id, newQty);
    } catch (err) {
      toast.error(err.message || "Could not update quantity.");
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeItem(item._id);
      toast.success("Item removed from cart.");
    } catch {
      toast.error("Could not remove item.");
    }
  };

  const maxQty = Math.min(item.variant?.stock ?? 10, 10);
  const imageUrl = item.product?.image || null;

  return (
    <div className="flex gap-4 py-5 border-b border-[#f0ebe3] last:border-b-0">
      {/* Product image */}
      <Link
        to={`/products/${item.product?.slug}`}
        className="shrink-0 w-20 h-24 sm:w-24 sm:h-28 bg-[#f4f1ec] overflow-hidden block"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.product?.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={20} className="text-[#ccc]" />
          </div>
        )}
      </Link>

      {/* Item details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div>
          <Link
            to={`/products/${item.product?.slug}`}
            className="text-sm font-medium text-[#1a1a1a] hover:text-[#c9a96e] transition-colors leading-snug line-clamp-2 block"
          >
            {item.product?.name}
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {item.variant?.color && (
              <span className="text-[11px] text-[#888]">
                {item.variant.color}
              </span>
            )}
            {item.variant?.size && (
              <>
                <span className="text-[#ddd]">·</span>
                <span className="text-[11px] text-[#888]">
                  {item.variant.size}
                </span>
              </>
            )}
          </div>
          {/* Price changed warning */}
          {item.priceChanged && (
            <p className="text-[10px] text-amber-600 mt-1 font-medium">
              Price updated since added
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Quantity control */}
          <div className="flex items-center border border-[#d0c8be]">
            <button
              onClick={() => handleQtyChange(item.quantity - 1)}
              disabled={updating || item.quantity <= 1}
              className="w-8 h-8 flex items-center justify-center text-[#555] hover:bg-[#f0ebe3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              <Minus size={13} />
            </button>
            <span className="w-9 text-center text-sm font-medium text-[#1a1a1a]">
              {updating ? "…" : item.quantity}
            </span>
            <button
              onClick={() => handleQtyChange(item.quantity + 1)}
              disabled={updating || item.quantity >= maxQty}
              className="w-8 h-8 flex items-center justify-center text-[#555] hover:bg-[#f0ebe3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Subtotal */}
          <span className="text-sm font-semibold text-[#1a1a1a]">
            {formatPrice(item.currentPrice * item.quantity)}
          </span>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={handleRemove}
        className="shrink-0 p-1.5 text-[#bbb] hover:text-red-500 transition-colors self-start mt-1"
        aria-label="Remove item"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// ORDER SUMMARY PANEL
// ─────────────────────────────────────────────
function OrderSummary({ subtotal, onCheckout }) {
  const shippingFee = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;
  const remaining = SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="bg-white border border-[#e8e0d4] p-6 space-y-5 h-fit sticky top-24">
      <h2 className="font-serif text-xl text-[#1a1a1a]">Order Summary</h2>

      {/* Free shipping progress */}
      {subtotal < SHIPPING_THRESHOLD && (
        <div>
          <p className="text-xs text-[#777] mb-2">
            Add{" "}
            <span className="font-semibold text-[#1a1a1a]">
              {formatPrice(remaining)}
            </span>{" "}
            more for free shipping
          </p>
          <div className="h-1.5 bg-[#ece8e0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c9a96e] rounded-full transition-all duration-500"
              style={{ width: `${Math.min((subtotal / SHIPPING_THRESHOLD) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-[#666]">Subtotal</span>
          <span className="text-[#1a1a1a] font-medium">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#666]">Shipping</span>
          {shippingFee === 0 ? (
            <span className="text-green-600 font-medium text-xs uppercase tracking-wide">Free</span>
          ) : (
            <span className="text-[#1a1a1a] font-medium">{formatPrice(shippingFee)}</span>
          )}
        </div>
        <div className="border-t border-[#ece8e0] pt-2.5 flex justify-between font-semibold text-base">
          <span className="text-[#1a1a1a]">Total</span>
          <span className="text-[#1a1a1a] font-serif text-lg">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Checkout CTA */}
      <button
        onClick={onCheckout}
        className="w-full bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-bold py-4 hover:bg-[#c9a96e] transition-colors flex items-center justify-center gap-2 group"
      >
        Proceed to Checkout
        <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="flex items-center gap-2 justify-center text-[10px] text-[#aaa] tracking-wide">
        <Package size={11} />
        <span>Secure checkout · Pakistan delivery</span>
      </div>

      {/* Payment badges */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {["COD", "Bank Transfer", "EasyPaisa", "JazzCash"].map((m) => (
          <span
            key={m}
            className="text-[9px] tracking-wide px-2 py-0.5 border border-[#ece8e0] text-[#888] rounded-sm"
          >
            {m}
          </span>
        ))}
      </div>

      {/* WhatsApp assistance */}
      <a
        href={`https://wa.me/${WHATSAPP}?text=Hi! I need help with my order.`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-xs text-[#25D366] hover:underline"
      >
        <MessageCircle size={13} />
        Need help? Chat with us
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────
// Import useState at the top (needed by CartItem)
// ─────────────────────────────────────────────
import { useState } from "react";

// ─────────────────────────────────────────────
// CART PAGE
// ─────────────────────────────────────────────
export default function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { items, itemCount, subtotal, clearCart } = useCartStore();
  const [clearing, setClearing] = useState(false);

  const handleCheckout = () => {
    navigate("/checkout");
  };

  const handleClearCart = async () => {
    if (!window.confirm("Remove all items from your cart?")) return;
    setClearing(true);
    try {
      await clearCart();
      toast.success("Cart cleared.");
    } catch {
      toast.error("Could not clear cart.");
    } finally {
      setClearing(false);
    }
  };

  // ── Empty cart ────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#f9f7f4]">
        <div className="text-center px-4 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-[#f0ebe3] flex items-center justify-center mx-auto mb-5">
            <ShoppingBag size={32} className="text-[#c9a96e]" />
          </div>
          <h1 className="font-serif text-3xl text-[#1a1a1a] mb-3">
            Your Cart is Empty
          </h1>
          <p className="text-sm text-[#888] mb-8 leading-relaxed">
            Looks like you haven't added any bags yet. Explore our collection and find your perfect match.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-bold px-8 py-4 hover:bg-[#c9a96e] transition-colors group"
          >
            Start Shopping
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          {!isAuthenticated && (
            <p className="text-xs text-[#aaa] mt-5">
              <Link to="/login" className="text-[#c9a96e] hover:underline">
                Sign in
              </Link>{" "}
              to see your saved cart
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Header */}
      <div className="bg-white border-b border-[#ece8e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">
              Shopping Cart
              <span className="ml-2 text-base font-sans font-normal text-[#888]">
                ({itemCount} item{itemCount !== 1 ? "s" : ""})
              </span>
            </h1>
            <button
              onClick={handleClearCart}
              disabled={clearing}
              className="text-xs text-[#888] hover:text-red-500 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              {clearing ? "Clearing…" : "Clear all"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Cart items */}
          <div className="lg:flex-1 min-w-0">
            <div className="bg-white border border-[#e8e0d4] px-4 sm:px-6">
              {items.map((item) => (
                <CartItem key={item._id} item={item} />
              ))}
            </div>

            {/* Continue shopping */}
            <Link
              to="/products"
              className="inline-flex items-center gap-2 mt-5 text-xs text-[#555] hover:text-[#c9a96e] transition-colors font-medium tracking-wide"
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* Order summary */}
          <div className="lg:w-80 xl:w-96">
            <OrderSummary subtotal={subtotal} onCheckout={handleCheckout} />
          </div>
        </div>
      </div>
    </div>
  );
}