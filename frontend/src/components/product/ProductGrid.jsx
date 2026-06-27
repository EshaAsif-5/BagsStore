import ProductCard from "./ProductCard.jsx";
import { ShoppingBag } from "lucide-react";

// ─────────────────────────────────────────────
// SKELETON CARD — matches ProductCard dimensions
// ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white animate-pulse">
      {/* Image placeholder — 3:4 aspect */}
      <div className="aspect-[3/4] bg-[#ece8e0]" />
      <div className="pt-3 pb-4 px-1 space-y-2">
        <div className="h-2 w-14 bg-[#ece8e0] rounded-full" />
        <div className="h-3.5 w-4/5 bg-[#ece8e0] rounded-full" />
        <div className="h-3.5 w-3/5 bg-[#ece8e0] rounded-full" />
        <div className="h-3 w-1/3 bg-[#ece8e0] rounded-full mt-2" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────
function EmptyState({ message = "No products found.", onReset }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[#f0ebe3] flex items-center justify-center mb-4">
        <ShoppingBag size={28} className="text-[#c9a96e]" />
      </div>
      <h3 className="text-base font-serif text-[#1a1a1a] mb-2">
        {message}
      </h3>
      <p className="text-sm text-[#888] mb-6 max-w-xs">
        Try adjusting your filters or search terms to find what you're looking for.
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs tracking-[1.5px] uppercase font-medium text-white bg-[#1a1a1a] px-6 py-2.5 hover:bg-[#c9a96e] transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PRODUCT GRID
//
// Props:
//   products    — array of product objects
//   isLoading   — shows skeleton cards
//   skeletonCount — number of skeletons (default 8)
//   emptyMessage  — custom empty state text
//   onResetFilters — callback to clear filters
//   columns     — override grid column classes
// ─────────────────────────────────────────────
export default function ProductGrid({
  products = [],
  isLoading = false,
  skeletonCount = 8,
  emptyMessage,
  onResetFilters,
  columns = "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
}) {
  // Loading state — show skeletons
  if (isLoading) {
    return (
      <div className={`grid ${columns} gap-x-4 gap-y-8`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!products || products.length === 0) {
    return (
      <div className={`grid ${columns}`}>
        <EmptyState message={emptyMessage} onReset={onResetFilters} />
      </div>
    );
  }

  return (
    <div className={`grid ${columns} gap-x-4 gap-y-8`}>
      {products.map((product, index) => (
        <ProductCard
          key={product._id}
          product={product}
          priority={index < 4} // Eagerly load above-fold images
        />
      ))}
    </div>
  );
}