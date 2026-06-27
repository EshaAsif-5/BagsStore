import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Star, Eye } from "lucide-react";
import useAuthStore from "../../store/authStore.js";
import useCartStore from "../../store/cartStore.js";
import useWishlistStore from "../../store/wishlistStore.js";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatPrice = (n) =>
  `PKR ${Number(n).toLocaleString("en-PK")}`;

const getCategoryLabel = (slug) => ({
  university: "University",
  modern: "Modern",
  luxury: "Luxury",
  stylish: "Stylish",
}[slug] ?? slug);

// ─────────────────────────────────────────────
// PRODUCT CARD
// Displays a product in the catalog grid.
// Shows primary image with hover secondary image swap,
// color swatches, quick-add to cart, and wishlist toggle.
//
// Props:
//   product — full product object from API
//   priority — boolean, whether to eagerly load the image
// ─────────────────────────────────────────────
export default function ProductCard({ product, priority = false }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const { isWishlisted, toggleWishlist } = useWishlistStore();

  const [hoveredImageIdx, setHoveredImageIdx] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  if (!product) return null;

  const {
    _id,
    name,
    slug,
    category,
    images = [],
    variants = [],
    averageRating = 0,
    reviewCount = 0,
  } = product;

  // Images
  const primaryImage = images.find((i) => i.isPrimary) || images[0];
  const hoverImage = images[1] || primaryImage;
  const displayImage = hoveredImageIdx === 1 && images[1] ? hoverImage : primaryImage;

  // Pricing — lowest variant price
  const prices = variants.map((v) => v.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const hasMultiplePrices = minPrice !== maxPrice;

  // Compare price (first variant's comparePrice)
  const comparePrice = variants[0]?.comparePrice;
  const hasDiscount = comparePrice && comparePrice > minPrice;

  // Stock
  const totalStock = variants.reduce((s, v) => s + (v.stock || 0), 0);
  const isOutOfStock = totalStock === 0;

  // Unique colors for swatches
  const uniqueColors = [];
  const seen = new Set();
  for (const v of variants) {
    if (!seen.has(v.color)) {
      seen.add(v.color);
      uniqueColors.push({ color: v.color, colorHex: v.colorHex || "#000" });
    }
  }

  // Wishlist state
  const wishlisted = isWishlisted(String(_id), isAuthenticated);

  // Quick add — picks first in-stock variant
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    const firstAvailable = variants.find((v) => v.stock > 0);
    if (!firstAvailable) return;

    setAddingToCart(true);
    try {
      await addItem({
        productId: String(_id),
        variantId: String(firstAvailable._id),
        quantity: 1,
        productSnapshot: {
          product: { _id, name, slug, category, image: primaryImage?.url },
          variant: firstAvailable,
        },
      });
      toast.success(`${name} added to cart!`);
    } catch (err) {
      toast.error(err.message || "Could not add to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (togglingWishlist) return;

    setTogglingWishlist(true);
    try {
      const action = await toggleWishlist(String(_id), isAuthenticated);
      toast.success(action === "added" ? "Added to wishlist!" : "Removed from wishlist.");
    } catch {
      if (!isAuthenticated) {
        toast.error("Sign in to save to your wishlist.");
        navigate("/login");
      } else {
        toast.error("Could not update wishlist.");
      }
    } finally {
      setTogglingWishlist(false);
    }
  };

  return (
    <article className="group relative bg-white flex flex-col">
      {/* Image container */}
      <Link
        to={`/products/${slug}`}
        className="block relative overflow-hidden aspect-[3/4] bg-[#f4f1ec]"
        onMouseEnter={() => setHoveredImageIdx(1)}
        onMouseLeave={() => setHoveredImageIdx(0)}
        tabIndex={-1}
        aria-label={name}
      >
        {/* Category badge */}
        <span className="absolute top-3 left-3 z-10 text-[9px] tracking-[2px] uppercase font-semibold bg-white text-[#1a1a1a] px-2 py-1">
          {getCategoryLabel(category)}
        </span>

        {/* Out of stock badge */}
        {isOutOfStock && (
          <span className="absolute top-3 right-3 z-10 text-[9px] tracking-[1.5px] uppercase font-semibold bg-[#1a1a1a] text-white px-2 py-1">
            Sold Out
          </span>
        )}

        {/* Discount badge */}
        {hasDiscount && !isOutOfStock && (
          <span className="absolute top-3 right-3 z-10 text-[9px] tracking-[1.5px] uppercase font-semibold bg-[#c9a96e] text-white px-2 py-1">
            Sale
          </span>
        )}

        {/* Product image */}
        {displayImage?.url ? (
          <img
            src={displayImage.url}
            alt={displayImage.alt || name}
            loading={priority ? "eager" : "lazy"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#ece8e0]">
            <ShoppingBag size={32} className="text-[#ccc]" />
          </div>
        )}

        {/* Hover overlay — Quick actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* Quick action buttons — appear on hover */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex">
          <button
            onClick={handleQuickAdd}
            disabled={isOutOfStock || addingToCart}
            className="flex-1 bg-[#1a1a1a] text-white text-[11px] tracking-[1.5px] uppercase font-medium py-3 hover:bg-[#c9a96e] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-label={isOutOfStock ? "Out of stock" : `Add ${name} to cart`}
          >
            <ShoppingBag size={13} />
            {addingToCart ? "Adding…" : isOutOfStock ? "Sold Out" : "Quick Add"}
          </button>
          <Link
            to={`/products/${slug}`}
            className="bg-white text-[#1a1a1a] px-4 flex items-center hover:bg-[#f0ebe3] transition-colors border-l border-[#e0d8ce]"
            aria-label={`View ${name} details`}
          >
            <Eye size={16} />
          </Link>
        </div>
      </Link>

      {/* Wishlist button — floats on image */}
      <button
        onClick={handleToggleWishlist}
        disabled={togglingWishlist}
        className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
          opacity-0 group-hover:opacity-100 focus:opacity-100
          ${hasDiscount && !isOutOfStock ? "top-11" : ""}
          ${wishlisted
            ? "bg-[#1a1a1a] text-[#c9a96e] opacity-100"
            : "bg-white text-[#555] hover:bg-[#1a1a1a] hover:text-[#c9a96e]"
          }`}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          size={14}
          className={wishlisted ? "fill-current" : ""}
        />
      </button>

      {/* Product info */}
      <div className="pt-3 pb-4 px-1 flex flex-col gap-1 flex-1">
        {/* Rating */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={10}
                  className={
                    star <= Math.round(averageRating)
                      ? "fill-[#c9a96e] text-[#c9a96e]"
                      : "fill-[#e0d8ce] text-[#e0d8ce]"
                  }
                />
              ))}
            </div>
            <span className="text-[10px] text-[#888]">({reviewCount})</span>
          </div>
        )}

        {/* Name */}
        <Link
          to={`/products/${slug}`}
          className="text-sm font-medium text-[#1a1a1a] hover:text-[#c9a96e] transition-colors leading-snug line-clamp-2"
        >
          {name}
        </Link>

        {/* Color swatches */}
        {uniqueColors.length > 1 && (
          <div className="flex items-center gap-1 mt-0.5">
            {uniqueColors.slice(0, 5).map(({ color, colorHex }) => (
              <span
                key={color}
                title={color}
                style={{ backgroundColor: colorHex }}
                className="w-3 h-3 rounded-full border border-white ring-1 ring-[#ddd]"
              />
            ))}
            {uniqueColors.length > 5 && (
              <span className="text-[10px] text-[#888]">+{uniqueColors.length - 5}</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="text-sm font-semibold text-[#1a1a1a]">
            {hasMultiplePrices
              ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
              : formatPrice(minPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-[#aaa] line-through">
              {formatPrice(comparePrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}