import { useSearchParams } from "react-router-dom";
import { ArrowUpDown, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────
// SORT OPTIONS
// ─────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "rating-desc", label: "Top Rated" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

// Human-readable label for active filter chips
const FILTER_LABELS = {
  category: {
    university: "University",
    modern: "Modern",
    luxury: "Luxury",
    stylish: "Stylish",
  },
  inStock: { true: "In Stock" },
};

// ─────────────────────────────────────────────
// PRODUCT SORT BAR
//
// Renders above the product grid.
// Shows:
//   • Result count
//   • Active filter chips (removable)
//   • Sort dropdown
//   • Mobile filter toggle button
//
// Props:
//   total           — total result count from API
//   isLoading       — skeleton mode
//   onOpenFilters   — callback to open mobile filter drawer
// ─────────────────────────────────────────────
export default function ProductSortBar({ total = 0, isLoading = false, onOpenFilters }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  const currentSort = searchParams.get("sortBy") || "newest";
  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label || "Newest First";

  // Build removable filter chips from URL params
  const chips = [];

  const category = searchParams.get("category");
  if (category) {
    chips.push({
      key: "category",
      value: category,
      label: FILTER_LABELS.category[category] || category,
      remove: () => {
        const next = new URLSearchParams(searchParams);
        next.delete("category");
        next.delete("page");
        setSearchParams(next);
      },
    });
  }

  searchParams.getAll("color").forEach((color) => {
    chips.push({
      key: `color-${color}`,
      value: color,
      label: color,
      remove: () => {
        const next = new URLSearchParams(searchParams);
        const colors = next.getAll("color").filter((c) => c !== color);
        next.delete("color");
        next.delete("page");
        colors.forEach((c) => next.append("color", c));
        setSearchParams(next);
      },
    });
  });

  searchParams.getAll("size").forEach((size) => {
    chips.push({
      key: `size-${size}`,
      value: size,
      label: `Size: ${size}`,
      remove: () => {
        const next = new URLSearchParams(searchParams);
        const sizes = next.getAll("size").filter((s) => s !== size);
        next.delete("size");
        next.delete("page");
        sizes.forEach((s) => next.append("size", s));
        setSearchParams(next);
      },
    });
  });

  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  if (minPrice || maxPrice) {
    chips.push({
      key: "price",
      label: `PKR ${minPrice || "0"} – ${maxPrice || "any"}`,
      remove: () => {
        const next = new URLSearchParams(searchParams);
        next.delete("minPrice");
        next.delete("maxPrice");
        next.delete("page");
        setSearchParams(next);
      },
    });
  }

  const inStock = searchParams.get("inStock");
  if (inStock === "true") {
    chips.push({
      key: "inStock",
      label: "In Stock Only",
      remove: () => {
        const next = new URLSearchParams(searchParams);
        next.delete("inStock");
        next.delete("page");
        setSearchParams(next);
      },
    });
  }

  const search = searchParams.get("search");
  if (search) {
    chips.push({
      key: "search",
      label: `"${search}"`,
      remove: () => {
        const next = new URLSearchParams(searchParams);
        next.delete("search");
        next.delete("page");
        setSearchParams(next);
      },
    });
  }

  const clearAll = () => {
    const next = new URLSearchParams();
    const sort = searchParams.get("sortBy");
    if (sort) next.set("sortBy", sort);
    setSearchParams(next);
  };

  // Set sort and close dropdown
  const handleSort = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set("sortBy", value);
    next.delete("page");
    setSearchParams(next);
    setSortOpen(false);
  };

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-3">

      {/* Top row — count + sort + mobile filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* Result count */}
        <div className="flex items-center gap-3">
          {/* Mobile: filter button */}
          {onOpenFilters && (
            <button
              onClick={onOpenFilters}
              className="lg:hidden flex items-center gap-2 text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] border border-[#d0c8be] px-3 py-2 hover:border-[#1a1a1a] transition-colors"
            >
              <SlidersHorizontal size={13} />
              Filters
              {chips.length > 0 && (
                <span className="bg-[#1a1a1a] text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-1 ml-0.5">
                  {chips.length}
                </span>
              )}
            </button>
          )}

          {isLoading ? (
            <div className="h-3.5 w-28 bg-[#ece8e0] rounded-full animate-pulse" />
          ) : (
            <p className="text-xs text-[#888]">
              <span className="font-semibold text-[#1a1a1a]">{total.toLocaleString()}</span>
              {" "}product{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((p) => !p)}
            className="flex items-center gap-2 text-xs tracking-[1px] text-[#333] border border-[#d0c8be] px-3.5 py-2 hover:border-[#1a1a1a] transition-colors min-w-[160px] justify-between bg-white"
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
          >
            <span className="flex items-center gap-2">
              <ArrowUpDown size={12} className="text-[#888]" />
              <span>{currentSortLabel}</span>
            </span>
            <ChevronDown
              size={12}
              className={`text-[#888] transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`}
            />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#e0d8ce] shadow-lg z-20">
              <ul role="listbox" aria-label="Sort products by">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <li key={value}>
                    <button
                      onClick={() => handleSort(value)}
                      role="option"
                      aria-selected={currentSort === value}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        currentSort === value
                          ? "bg-[#f0ebe3] text-[#1a1a1a] font-semibold"
                          : "text-[#555] hover:bg-[#f9f7f4] hover:text-[#1a1a1a]"
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] tracking-[1.5px] uppercase text-[#aaa] font-medium">
            Active:
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.remove}
              className="flex items-center gap-1.5 text-[11px] bg-[#1a1a1a] text-white px-2.5 py-1 hover:bg-[#c9a96e] transition-colors group"
            >
              {chip.label}
              <X size={10} className="opacity-70 group-hover:opacity-100" />
            </button>
          ))}
          {chips.length > 1 && (
            <button
              onClick={clearAll}
              className="text-[11px] text-[#c9a96e] hover:text-[#1a1a1a] transition-colors font-medium underline underline-offset-2"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}