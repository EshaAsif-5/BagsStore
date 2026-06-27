import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X, SlidersHorizontal } from "lucide-react";
import ProductGrid from "../../components/product/ProductGrid.jsx";
import ProductFilterSidebar from "../../components/product/ProductFilterSidebar.jsx";
import ProductSortBar from "../../components/product/ProductSortBar.jsx";
import productService from "../../services/productService.js";

const LIMIT = 12;

// ─────────────────────────────────────────────
// MOBILE FILTER DRAWER
// ─────────────────────────────────────────────
function MobileFilterDrawer({ open, onClose, filterMeta, isLoadingMeta }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-auto w-[88vw] max-w-sm h-full bg-[#f9f7f4] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e0d4] shrink-0">
          <h2 className="text-xs tracking-[2.5px] uppercase font-bold text-[#1a1a1a]">
            Filters
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#666] hover:text-[#1a1a1a] transition-colors"
            aria-label="Close filters"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable filters */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <ProductFilterSidebar
            filterMeta={filterMeta}
            isLoading={isLoadingMeta}
          />
        </div>

        {/* Apply button */}
        <div className="shrink-0 px-5 py-4 border-t border-[#e8e0d4] bg-white">
          <button
            onClick={onClose}
            className="w-full bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-bold py-3.5 hover:bg-[#c9a96e] transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mt-12">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-4 py-2 text-xs border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Prev
      </button>

      {getPages().map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-[#aaa] text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={page === p ? "page" : undefined}
            className={`w-9 h-9 text-xs border transition-colors ${
              page === p
                ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                : "border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] hover:bg-[#f0ebe3]"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-4 py-2 text-xs border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// CATALOG PAGE
// ─────────────────────────────────────────────
export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Build query params from URL
  const page = parseInt(searchParams.get("page") || "1");
  const queryParams = {
    page,
    limit: LIMIT,
    sortBy: searchParams.get("sortBy") || undefined,
    category: searchParams.get("category") || undefined,
    search: searchParams.get("search") || undefined,
    minPrice: searchParams.get("minPrice") || undefined,
    maxPrice: searchParams.get("maxPrice") || undefined,
    inStock: searchParams.get("inStock") || undefined,
    isFeatured: searchParams.get("isFeatured") || undefined,
    color: searchParams.getAll("color").length
      ? searchParams.getAll("color")
      : undefined,
    size: searchParams.getAll("size").length
      ? searchParams.getAll("size")
      : undefined,
  };

  // Remove undefined keys
  const cleanParams = Object.fromEntries(
    Object.entries(queryParams).filter(([, v]) => v !== undefined)
  );

  // Products query
  const {
    data,
    isLoading,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["products", cleanParams],
    queryFn: () => productService.getProducts(cleanParams),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000,
  });

  // Filter metadata query
  const { data: filterMeta, isLoading: isLoadingMeta } = useQuery({
    queryKey: ["products", "filter-meta"],
    queryFn: () => productService.getFilterMeta(),
    staleTime: 10 * 60 * 1000,
  });

  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Page title
  const categoryLabel = {
    university: "University Bags",
    modern: "Modern Bags",
    luxury: "Luxury Bags",
    stylish: "Stylish Bags",
  }[searchParams.get("category")] || "All Products";

  const searchQuery = searchParams.get("search");
  const pageTitle = searchQuery
    ? `Results for "${searchQuery}"`
    : categoryLabel;

  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Page header */}
      <div className="bg-white border-b border-[#ece8e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="text-[11px] tracking-[1.5px] uppercase text-[#aaa] mb-3 flex items-center gap-2">
            <a href="/" className="hover:text-[#c9a96e] transition-colors">Home</a>
            <span>/</span>
            <span className="text-[#555]">{pageTitle}</span>
          </nav>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="sticky top-24">
              <ProductFilterSidebar
                filterMeta={filterMeta}
                isLoading={isLoadingMeta}
              />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* Sort bar + active chips */}
            <div className="mb-6">
              <ProductSortBar
                total={total}
                isLoading={isLoading}
                onOpenFilters={() => setMobileFiltersOpen(true)}
              />
            </div>

            {/* Loading overlay when re-fetching with previous data */}
            <div className={`transition-opacity duration-150 ${isFetching && !isLoading ? "opacity-60" : "opacity-100"}`}>
              {isError ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-[#888] mb-4">Failed to load products.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs tracking-[1.5px] uppercase font-semibold text-white bg-[#1a1a1a] px-5 py-2.5 hover:bg-[#c9a96e] transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <ProductGrid
                  products={products}
                  isLoading={isLoading}
                  skeletonCount={LIMIT}
                  onResetFilters={handleResetFilters}
                  columns="grid-cols-2 md:grid-cols-3 xl:grid-cols-3"
                />
              )}
            </div>

            {/* Pagination */}
            {!isLoading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <MobileFilterDrawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filterMeta={filterMeta}
        isLoadingMeta={isLoadingMeta}
      />
    </div>
  );
}