import { useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  Heart,
  Share2,
  MessageCircle,
  Package,
  Shield,
  Truck,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import ProductImageGallery from "../../components/product/ProductImageGallery.jsx";
import ProductVariantSelector from "../../components/product/ProductVariantSelector.jsx";
import ProductReviewList from "../../components/product/ProductReviewList.jsx";
import ProductGrid from "../../components/product/ProductGrid.jsx";
import productService from "../../services/productService.js";
import useCartStore from "../../store/cartStore.js";
import useWishlistStore from "../../store/wishlistStore.js";
import useAuthStore from "../../store/authStore.js";
import toast from "react-hot-toast";
import { env } from "../../config/env.js";

const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const WHATSAPP = env.whatsappNumber;

// ─────────────────────────────────────────────
// ACCORDION SECTION
// ─────────────────────────────────────────────
function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#ece8e0]">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between py-4 text-left group"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-[#1a1a1a] tracking-wide group-hover:text-[#c9a96e] transition-colors">
          {title}
        </span>
        {open ? (
          <ChevronUp size={16} className="text-[#888] shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[#888] shrink-0" />
        )}
      </button>
      {open && (
        <div className="pb-5 text-sm text-[#555] leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────
function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 animate-pulse">
        {/* Gallery skeleton */}
        <div className="lg:w-[55%] space-y-3">
          <div className="aspect-square sm:aspect-[4/5] bg-[#ece8e0]" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-16 h-16 bg-[#ece8e0]" />
            ))}
          </div>
        </div>
        {/* Info skeleton */}
        <div className="lg:flex-1 space-y-5">
          <div className="h-3 w-20 bg-[#ece8e0] rounded-full" />
          <div className="h-8 w-4/5 bg-[#ece8e0] rounded-full" />
          <div className="h-5 w-28 bg-[#ece8e0] rounded-full" />
          <div className="h-px bg-[#ece8e0]" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-[#ece8e0] rounded-full" />
            <div className="h-3 w-5/6 bg-[#ece8e0] rounded-full" />
            <div className="h-3 w-3/4 bg-[#ece8e0] rounded-full" />
          </div>
          <div className="h-12 bg-[#ece8e0]" />
          <div className="h-12 bg-[#ece8e0]" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PRODUCT DETAIL PAGE
// ─────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const { isWishlisted, toggleWishlist } = useWishlistStore();

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => productService.getProductBySlug(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });

  const product = data?.product;
  const related = data?.related || [];

  const handleVariantChange = useCallback((variant) => {
    setSelectedVariant(variant);
    setQuantity(1); // Reset quantity when variant changes
  }, []);

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error("Please select a colour and size.");
      return;
    }
    if (selectedVariant.stock === 0) {
      toast.error("This variant is out of stock.");
      return;
    }

    setAddingToCart(true);
    try {
      await addItem({
        productId: String(product._id),
        variantId: String(selectedVariant._id),
        quantity,
        productSnapshot: {
          product: {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            category: product.category,
            image:
              product.images?.find((i) => i.isPrimary)?.url ||
              product.images?.[0]?.url,
          },
          variant: selectedVariant,
        },
      });
      toast.success(`${product.name} added to cart!`);
    } catch (err) {
      toast.error(err.message || "Could not add to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate("/checkout");
  };

  const handleToggleWishlist = async () => {
    if (togglingWishlist) return;
    setTogglingWishlist(true);
    try {
      const action = await toggleWishlist(String(product._id), isAuthenticated);
      toast.success(
        action === "added" ? "Added to wishlist!" : "Removed from wishlist."
      );
    } catch {
      if (!isAuthenticated) {
        toast.error("Sign in to save to your wishlist.");
        navigate("/login");
      }
    } finally {
      setTogglingWishlist(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast.success("Link copied to clipboard!");
      });
    }
  };

  // ── Error state ────────────────────────────
  if (isError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
        <div>
          <p className="text-[#888] mb-4">This product could not be found.</p>
          <Link
            to="/products"
            className="text-xs tracking-[1.5px] uppercase font-semibold text-white bg-[#1a1a1a] px-6 py-3 hover:bg-[#c9a96e] transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────
  if (isLoading || !product) {
    return <ProductDetailSkeleton />;
  }

  // ── Derived values ─────────────────────────
  const wishlisted = isWishlisted(String(product._id), isAuthenticated);
  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const maxPrice = Math.max(...product.variants.map((v) => v.price));
  const hasMultiplePrices = minPrice !== maxPrice;
  const displayPrice = selectedVariant
    ? selectedVariant.price
    : minPrice;
  const comparePrice = selectedVariant?.comparePrice || product.variants[0]?.comparePrice;
  const hasDiscount = comparePrice && comparePrice > displayPrice;
  const discountPct = hasDiscount
    ? Math.round(((comparePrice - displayPrice) / comparePrice) * 100)
    : 0;
  const maxQty = selectedVariant
    ? Math.min(selectedVariant.stock, 10)
    : 10;

  const whatsappMessage = encodeURIComponent(
    `Hi! I'm interested in the ${product.name}${selectedVariant ? ` (${selectedVariant.color}, ${selectedVariant.size})` : ""} — ${window.location.href}`
  );

  return (
    <div className="bg-[#f9f7f4]">

      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#ece8e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="text-[11px] tracking-[1.5px] uppercase text-[#aaa] flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-[#c9a96e] transition-colors">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-[#c9a96e] transition-colors">Products</Link>
            <span>/</span>
            <Link
              to={`/products?category=${product.category}`}
              className="hover:text-[#c9a96e] transition-colors capitalize"
            >
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-[#333] normal-case">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Main product section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">

          {/* ── Image Gallery ──────────────── */}
          <div className="lg:w-[55%] xl:w-[52%]">
            <ProductImageGallery
              images={product.images}
              productName={product.name}
            />
          </div>

          {/* ── Product Info ───────────────── */}
          <div className="lg:flex-1 space-y-6">

            {/* Category tag */}
            <div className="flex items-center gap-3">
              <Link
                to={`/products?category=${product.category}`}
                className="text-[10px] tracking-[2px] uppercase font-semibold text-[#c9a96e] hover:text-[#1a1a1a] transition-colors"
              >
                {product.category} Bags
              </Link>
              {product.isFeatured && (
                <span className="text-[9px] tracking-[1.5px] uppercase font-bold bg-[#c9a96e] text-white px-2 py-0.5">
                  Featured
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a] leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      className={
                        s <= Math.round(product.averageRating)
                          ? "fill-[#c9a96e] text-[#c9a96e]"
                          : "fill-[#e0d8ce] text-[#e0d8ce]"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-[#555]">
                  {Number(product.averageRating).toFixed(1)}
                </span>
                <a
                  href="#reviews"
                  className="text-sm text-[#888] hover:text-[#c9a96e] transition-colors"
                >
                  ({product.reviewCount} review{product.reviewCount !== 1 ? "s" : ""})
                </a>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-serif text-[#1a1a1a]">
                {selectedVariant
                  ? formatPrice(selectedVariant.price)
                  : hasMultiplePrices
                    ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
                    : formatPrice(minPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-[#aaa] line-through">
                    {formatPrice(comparePrice)}
                  </span>
                  <span className="text-sm font-bold text-[#c9a96e]">
                    {discountPct}% OFF
                  </span>
                </>
              )}
            </div>

            <div className="border-t border-[#ece8e0]" />

            {/* Variant selector */}
            <ProductVariantSelector
              variants={product.variants}
              onChange={handleVariantChange}
            />

            {/* Quantity selector */}
            {selectedVariant && selectedVariant.stock > 0 && (
              <div>
                <p className="text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] mb-2">
                  Quantity
                </p>
                <div className="flex items-center border border-[#d0c8be] w-fit">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity === 1}
                    className="w-10 h-10 flex items-center justify-center text-[#555] hover:bg-[#f0ebe3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-medium text-[#1a1a1a]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    className="w-10 h-10 flex items-center justify-center text-[#555] hover:bg-[#f0ebe3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                {selectedVariant.stock <= 5 && (
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    Only {selectedVariant.stock} left in stock
                  </p>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || !selectedVariant || selectedVariant?.stock === 0}
                className="w-full bg-[#1a1a1a] text-white text-sm tracking-[2px] uppercase font-bold py-4 hover:bg-[#c9a96e] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingBag size={16} />
                {addingToCart
                  ? "Adding…"
                  : !selectedVariant
                    ? "Select a Variant"
                    : selectedVariant.stock === 0
                      ? "Out of Stock"
                      : "Add to Cart"}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={!selectedVariant || selectedVariant?.stock === 0}
                className="w-full border-2 border-[#1a1a1a] text-[#1a1a1a] text-sm tracking-[2px] uppercase font-bold py-4 hover:bg-[#1a1a1a] hover:text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Buy Now
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleToggleWishlist}
                  disabled={togglingWishlist}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 border text-xs tracking-[1.5px] uppercase font-medium transition-all duration-200 ${
                    wishlisted
                      ? "border-[#c9a96e] bg-[#c9a96e]/10 text-[#c9a96e]"
                      : "border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                  }`}
                  aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                >
                  <Heart
                    size={15}
                    className={wishlisted ? "fill-current" : ""}
                  />
                  {wishlisted ? "Saved" : "Wishlist"}
                </button>

                <a
                  href={`https://wa.me/${WHATSAPP}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#25D366] text-[#25D366] text-xs tracking-[1.5px] uppercase font-medium hover:bg-[#25D366] hover:text-white transition-all duration-200"
                >
                  <MessageCircle size={15} />
                  Enquire
                </a>

                <button
                  onClick={handleShare}
                  className="w-12 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors"
                  aria-label="Share product"
                >
                  <Share2 size={15} />
                </button>
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { Icon: Truck, text: `Free Shipping\nAbove PKR ${(env.shippingFreeThreshold / 1000).toFixed(0)}K` },
                { Icon: Shield, text: "Quality\nGuaranteed" },
                { Icon: Package, text: "Easy\nReturns" },
              ].map(({ Icon, text }) => (
                <div
                  key={text}
                  className="flex flex-col items-center text-center gap-1.5 p-2.5 bg-white border border-[#ece8e0]"
                >
                  <Icon size={16} className="text-[#c9a96e]" />
                  <span className="text-[10px] text-[#777] leading-tight whitespace-pre-line">
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {/* Accordions */}
            <div className="pt-2">
              <Accordion title="Description" defaultOpen>
                <p>{product.description}</p>
              </Accordion>

              <Accordion title="Delivery & Returns">
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>Pakistan-wide delivery — 2 to 5 business days</li>
                  <li>Free shipping on orders above PKR {env.shippingFreeThreshold.toLocaleString("en-PK")}</li>
                  <li>Standard shipping: PKR {env.shippingFeeStandard.toLocaleString("en-PK")}</li>
                  <li>Cash on Delivery available nationwide</li>
                  <li>Returns accepted within 7 days of delivery</li>
                  <li>Item must be unused and in original packaging</li>
                </ul>
              </Accordion>

              <Accordion title="Payment Methods">
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>Cash on Delivery</li>
                  <li>Bank Transfer (Meezan, HBL, UBL)</li>
                  <li>EasyPaisa</li>
                  <li>JazzCash</li>
                  <li>Debit / Credit Card (coming soon)</li>
                </ul>
              </Accordion>

              {product.tags?.length > 0 && (
                <Accordion title="Tags">
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/products?search=${encodeURIComponent(tag)}`}
                        className="text-xs bg-[#f0ebe3] text-[#555] px-2.5 py-1 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </Accordion>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div id="reviews" className="bg-white border-t border-[#ece8e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <ProductReviewList
            productId={String(product._id)}
            averageRating={product.averageRating}
            reviewCount={product.reviewCount}
          />
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="bg-[#f9f7f4] border-t border-[#ece8e0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[10px] tracking-[3px] uppercase text-[#c9a96e] font-medium mb-2">
                  More Like This
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">
                  You May Also Like
                </h2>
              </div>
              <Link
                to={`/products?category=${product.category}`}
                className="text-xs tracking-[1.5px] uppercase font-semibold text-[#555] hover:text-[#c9a96e] transition-colors hidden sm:block"
              >
                View All →
              </Link>
            </div>

            <ProductGrid
              products={related}
              columns="grid-cols-2 sm:grid-cols-2 md:grid-cols-4"
            />
          </div>
        </div>
      )}
    </div>
  );
}