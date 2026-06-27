import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { X, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const CATEGORIES = [
  { value: "university", label: "University Bags" },
  { value: "modern", label: "Modern Bags" },
  { value: "luxury", label: "Luxury Bags" },
  { value: "stylish", label: "Stylish Bags" },
];

// ─────────────────────────────────────────────
// COLLAPSIBLE SECTION
// ─────────────────────────────────────────────
function FilterSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#ece8e0] pb-5">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between py-2 text-left group"
        aria-expanded={open}
      >
        <span className="text-[11px] tracking-[2px] uppercase font-semibold text-[#1a1a1a] group-hover:text-[#c9a96e] transition-colors">
          {title}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-[#888]" />
        ) : (
          <ChevronDown size={14} className="text-[#888]" />
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// PRODUCT FILTER SIDEBAR
//
// Reads/writes URL search params — the catalog page
// reads these to fetch filtered products.
//
// Props:
//   filterMeta — { colors[], sizes[], priceRange: { minPrice, maxPrice } }
//   isLoading  — shows skeleton while metadata loads
// ─────────────────────────────────────────────
export default function ProductFilterSidebar({ filterMeta, isLoading = false }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read active filters from URL
  const activeCategory = searchParams.get("category") || "";
  const activeColors = searchParams.getAll("color");
  const activeSizes = searchParams.getAll("size");
  const activeMinPrice = searchParams.get("minPrice") || "";
  const activeMaxPrice = searchParams.get("maxPrice") || "";
  const activeInStock = searchParams.get("inStock") === "true";

  // Local price inputs (don't apply until user blurs)
  const [localMin, setLocalMin] = useState(activeMinPrice);
  const [localMax, setLocalMax] = useState(activeMaxPrice);

  // Sync local price with URL changes (e.g. "clear all")
  useEffect(() => {
    setLocalMin(searchParams.get("minPrice") || "");
    setLocalMax(searchParams.get("maxPrice") || "");
  }, [searchParams]);

  const updateParams = (key, value, multi = false) => {
    const next = new URLSearchParams(searchParams);
    next.delete("page"); // Reset to page 1 on any filter change

    if (!value) {
      next.delete(key);
    } else if (multi) {
      const current = next.getAll(key);
      if (current.includes(value)) {
        next.delete(key);
        current.filter((v) => v !== value).forEach((v) => next.append(key, v));
      } else {
        next.append(key, value);
      }
    } else {
      next.set(key, value);
    }

    setSearchParams(next);
  };

  const applyPriceRange = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    if (localMin) next.set("minPrice", localMin);
    else next.delete("minPrice");
    if (localMax) next.set("maxPrice", localMax);
    else next.delete("maxPrice");
    setSearchParams(next);
  };

  const clearAll = () => {
    setSearchParams(new URLSearchParams());
    setLocalMin("");
    setLocalMax("");
  };

  // Count active filters (excluding page/sort)
  const activeFilterCount = [
    activeCategory,
    ...activeColors,
    ...activeSizes,
    activeMinPrice,
    activeMaxPrice,
    activeInStock,
  ].filter(Boolean).length;

  const priceRange = filterMeta?.priceRange || { minPrice: 0, maxPrice: 50000 };

  return (
    <aside aria-label="Product filters">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-[#888]" />
          <span className="text-xs tracking-[2px] uppercase font-semibold text-[#1a1a1a]">
            Filters
          </span>
          {activeFilterCount > 0 && (
            <span className="bg-[#1a1a1a] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-[10px] tracking-[1.5px] uppercase text-[#c9a96e] hover:text-[#1a1a1a] transition-colors font-medium flex items-center gap-1"
          >
            <X size={11} />
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-5">

        {/* CATEGORY */}
        <FilterSection title="Category">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => updateParams("category", "")}
                className={`text-sm w-full text-left py-0.5 transition-colors ${
                  !activeCategory ? "text-[#1a1a1a] font-semibold" : "text-[#666] hover:text-[#c9a96e]"
                }`}
              >
                All Products
              </button>
            </li>
            {CATEGORIES.map(({ value, label }) => (
              <li key={value}>
                <button
                  onClick={() => updateParams("category", value)}
                  className={`text-sm w-full text-left py-0.5 transition-colors ${
                    activeCategory === value
                      ? "text-[#1a1a1a] font-semibold"
                      : "text-[#666] hover:text-[#c9a96e]"
                  }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </FilterSection>

        {/* COLOR */}
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 w-16 bg-[#ece8e0] rounded-full" />
            <div className="flex gap-2 pt-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-[#ece8e0]" />
              ))}
            </div>
          </div>
        ) : filterMeta?.colors?.length > 0 ? (
          <FilterSection title="Color">
            <div className="flex flex-wrap gap-2">
              {filterMeta.colors.map((color) => {
                const isActive = activeColors.includes(color);
                return (
                  <button
                    key={color}
                    onClick={() => updateParams("color", color, true)}
                    title={color}
                    aria-label={color}
                    aria-pressed={isActive}
                    className={`w-8 h-8 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a96e] ${
                      isActive
                        ? "border-[#1a1a1a] scale-110"
                        : "border-transparent hover:border-[#aaa]"
                    }`}
                    style={{
                      // Use a color lookup or fallback to the name as background
                      backgroundColor: color.toLowerCase().replace(/\s/g, ""),
                      backgroundImage: "none",
                    }}
                  />
                );
              })}
            </div>
            {/* Active color labels */}
            {activeColors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {activeColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateParams("color", c, true)}
                    className="flex items-center gap-1 text-[10px] bg-[#f0ebe3] text-[#555] px-2 py-0.5 rounded-full hover:bg-[#e0d8ce] transition-colors"
                  >
                    {c}
                    <X size={9} />
                  </button>
                ))}
              </div>
            )}
          </FilterSection>
        ) : null}

        {/* SIZE */}
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 w-12 bg-[#ece8e0] rounded-full" />
            <div className="flex gap-2 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-12 h-8 bg-[#ece8e0]" />
              ))}
            </div>
          </div>
        ) : filterMeta?.sizes?.length > 0 ? (
          <FilterSection title="Size">
            <div className="flex flex-wrap gap-2">
              {filterMeta.sizes.map((size) => {
                const isActive = activeSizes.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() => updateParams("size", size, true)}
                    aria-pressed={isActive}
                    className={`min-w-[42px] px-2.5 py-1.5 text-xs tracking-[1px] uppercase font-medium border transition-all ${
                      isActive
                        ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                        : "border-[#d0c8be] text-[#555] hover:border-[#1a1a1a]"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </FilterSection>
        ) : null}

        {/* PRICE RANGE */}
        <FilterSection title="Price Range">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-[#888] uppercase tracking-[1px] block mb-1">
                  Min (PKR)
                </label>
                <input
                  type="number"
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  onBlur={applyPriceRange}
                  onKeyDown={(e) => e.key === "Enter" && applyPriceRange()}
                  placeholder={String(priceRange.minPrice)}
                  min="0"
                  className="w-full border border-[#d0c8be] px-2.5 py-1.5 text-xs text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white placeholder:text-[#bbb]"
                />
              </div>
              <span className="text-[#bbb] text-sm mt-4">–</span>
              <div className="flex-1">
                <label className="text-[10px] text-[#888] uppercase tracking-[1px] block mb-1">
                  Max (PKR)
                </label>
                <input
                  type="number"
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  onBlur={applyPriceRange}
                  onKeyDown={(e) => e.key === "Enter" && applyPriceRange()}
                  placeholder={String(priceRange.maxPrice)}
                  min="0"
                  className="w-full border border-[#d0c8be] px-2.5 py-1.5 text-xs text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white placeholder:text-[#bbb]"
                />
              </div>
            </div>
            {(activeMinPrice || activeMaxPrice) && (
              <p className="text-[10px] text-[#888]">
                PKR {activeMinPrice || "0"} – PKR {activeMaxPrice || "any"}
                <button
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("minPrice");
                    next.delete("maxPrice");
                    setSearchParams(next);
                    setLocalMin("");
                    setLocalMax("");
                  }}
                  className="ml-2 text-[#c9a96e] hover:underline"
                >
                  clear
                </button>
              </p>
            )}
          </div>
        </FilterSection>

        {/* AVAILABILITY */}
        <FilterSection title="Availability" defaultOpen={false}>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${
                activeInStock ? "bg-[#1a1a1a] border-[#1a1a1a]" : "border-[#bbb] group-hover:border-[#888]"
              }`}
              onClick={() => updateParams("inStock", activeInStock ? "" : "true")}
            >
              {activeInStock && (
                <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-2">
                  <polyline points="1.5,5 4,7.5 8.5,2.5" />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={activeInStock}
              onChange={() => updateParams("inStock", activeInStock ? "" : "true")}
              className="sr-only"
            />
            <span className="text-sm text-[#555] group-hover:text-[#1a1a1a] transition-colors">
              In Stock Only
            </span>
          </label>
        </FilterSection>
      </div>
    </aside>
  );
}