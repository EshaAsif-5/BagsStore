import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import wishlistService from "../../services/wishlistService.js";
import useCartStore from "../../store/cartStore.js";
import useWishlistStore from "../../store/wishlistStore.js";
import toast from "react-hot-toast";
import { useState } from "react";

const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;

function WishlistCard({ product, onRemove }) {
  const { addItem } = useCartStore();
  const [addingToCart, setAddingToCart] = useState(false);
  const [removing, setRemoving] = useState(false);

  const primaryImage = product.images?.find((i) => i.isPrimary) || product.images?.[0];
  const variants = product.variants || [];
  const minPrice = variants.length ? Math.min(...variants.map((v) => v.price)) : 0;
  const firstInStock = variants.find((v) => v.stock > 0);
  const isOutOfStock = !firstInStock;

  const handleAddToCart = async () => {
    if (!firstInStock) return toast.error("This product is out of stock.");
    setAddingToCart(true);
    try {
      await addItem({
        productId: String(product._id),
        variantId: String(firstInStock._id),
        quantity: 1,
        productSnapshot: {
          product: { _id: product._id, name: product.name, slug: product.slug, image: primaryImage?.url },
          variant: firstInStock,
        },
      });
      toast.success(`${product.name} added to cart!`);
    } catch (err) {
      toast.error(err.message || "Could not add to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove(String(product._id));
      toast.success("Removed from wishlist.");
    } catch {
      toast.error("Could not remove from wishlist.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="group bg-white border border-[#e8e0d4] flex flex-col hover:shadow-sm transition-all">
      {/* Image */}
      <Link to={`/products/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-[#f4f1ec]">
        {primaryImage?.url ? (
          <img
            src={primaryImage.url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={24} className="text-[#ccc]" />
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-[11px] tracking-[2px] uppercase font-bold bg-[#1a1a1a] text-white px-3 py-1.5">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <Link
          to={`/products/${product.slug}`}
          className="text-sm font-medium text-[#1a1a1a] hover:text-[#c9a96e] transition-colors line-clamp-2 leading-snug"
        >
          {product.name}
        </Link>
        <p className="text-sm font-semibold text-[#1a1a1a]">{formatPrice(minPrice)}</p>

        <div className="flex gap-2 mt-auto">
          <button
            onClick={handleAddToCart}
            disabled={addingToCart || isOutOfStock}
            className="flex-1 text-[10px] tracking-[1.5px] uppercase font-bold py-2.5 bg-[#1a1a1a] text-white hover:bg-[#c9a96e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <ShoppingBag size={11} />
            {addingToCart ? "Adding…" : isOutOfStock ? "Sold Out" : "Add to Cart"}
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-10 flex items-center justify-center border border-[#d0c8be] text-[#888] hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-40"
            aria-label="Remove from wishlist"
          >
            {removing ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const { removeFromWishlist } = useWishlistStore();

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn:  () => wishlistService.getWishlist(),
    staleTime: 2 * 60 * 1000,
  });

  const wishlist = data?.wishlist || [];
  const count    = data?.count    || 0;

  const handleRemove = async (productId) => {
    await removeFromWishlist(productId);
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">My Wishlist</h1>
          {count > 0 && (
            <p className="text-xs text-[#888] mt-1">{count} saved item{count !== 1 ? "s" : ""}</p>
          )}
        </div>
        {count > 0 && (
          <Link
            to="/products"
            className="flex items-center gap-2 text-xs tracking-[1.5px] uppercase font-semibold text-[#555] hover:text-[#c9a96e] transition-colors"
          >
            Continue Shopping <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-[#ece8e0]" />
              <div className="p-3.5 space-y-2">
                <div className="h-3 w-4/5 bg-[#ece8e0] rounded-full" />
                <div className="h-3 w-1/3 bg-[#ece8e0] rounded-full" />
                <div className="h-9 bg-[#ece8e0]" />
              </div>
            </div>
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="bg-white border border-[#e8e0d4] p-12 text-center">
          <Heart size={32} className="mx-auto text-[#e0d8ce] mb-4" />
          <h2 className="font-serif text-xl text-[#1a1a1a] mb-2">Your Wishlist is Empty</h2>
          <p className="text-sm text-[#888] mb-6 max-w-xs mx-auto">
            Save products you love and come back to them any time.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-bold px-7 py-3.5 hover:bg-[#c9a96e] transition-colors"
          >
            Explore Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {wishlist
            .filter((p) => p && p.isActive !== false)
            .map((product) => (
              <WishlistCard key={product._id} product={product} onRemove={handleRemove} />
            ))}
        </div>
      )}
    </div>
  );
}