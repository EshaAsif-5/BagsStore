import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

// ─────────────────────────────────────────────
// PRODUCT VARIANT SELECTOR
//
// Handles color → size selection flow:
//   1. User picks a color
//   2. Available sizes for that color are shown
//   3. Selecting a size resolves the final variant
//
// Props:
//   variants   — product.variants array
//   onChange   — (selectedVariant | null) => void
//   disabled   — disables all controls
// ─────────────────────────────────────────────
export default function ProductVariantSelector({ variants = [], onChange, disabled = false }) {
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  // Derive unique colors from variants
  const colors = useMemo(() => {
    const map = new Map();
    variants.forEach((v) => {
      if (!map.has(v.color)) {
        map.set(v.color, {
          color: v.color,
          colorHex: v.colorHex || "#888",
          hasStock: false,
        });
      }
      if (v.stock > 0) {
        map.get(v.color).hasStock = true;
      }
    });
    return Array.from(map.values());
  }, [variants]);

  // Sizes available for the selected color
  const sizesForColor = useMemo(() => {
    if (!selectedColor) return [];
    return variants
      .filter((v) => v.color === selectedColor)
      .map((v) => ({
        size: v.size,
        stock: v.stock,
        variantId: v._id,
        price: v.price,
        comparePrice: v.comparePrice,
        sku: v.sku,
      }))
      .sort((a, b) => {
        // Sort sizes in logical order
        const order = ["XS", "S", "M", "L", "XL", "XXL"];
        const ai = order.indexOf(a.size.toUpperCase());
        const bi = order.indexOf(b.size.toUpperCase());
        if (ai !== -1 && bi !== -1) return ai - bi;
        return a.size.localeCompare(b.size);
      });
  }, [selectedColor, variants]);

  // Auto-select the first available color
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      const first = colors.find((c) => c.hasStock) || colors[0];
      setSelectedColor(first.color);
    }
  }, [colors, selectedColor]);

  // Auto-select size when there's only one option for the color
  useEffect(() => {
    if (sizesForColor.length === 1) {
      setSelectedSize(sizesForColor[0].size);
    } else {
      // Reset size when color changes
      setSelectedSize(null);
    }
  }, [selectedColor, sizesForColor.length]);

  // Resolve and bubble up selected variant
  useEffect(() => {
    if (!selectedColor || !selectedSize) {
      onChange?.(null);
      return;
    }
    const match = variants.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
    onChange?.(match || null);
  }, [selectedColor, selectedSize, variants, onChange]);

  const selectedVariant = useMemo(() => {
    if (!selectedColor || !selectedSize) return null;
    return variants.find((v) => v.color === selectedColor && v.size === selectedSize) || null;
  }, [selectedColor, selectedSize, variants]);

  if (!variants || variants.length === 0) return null;

  // If only one variant exists, auto-select it for add-to-cart
  useEffect(() => {
    if (variants.length === 1) {
      onChange?.(variants[0]);
    }
  }, [variants, onChange]);

  if (variants.length === 1) {
    const v = variants[0];
    return (
      <div className="flex items-center gap-2 text-sm text-[#555]">
        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
        <span>
          {v.color} / {v.size}
          {v.stock > 0
            ? <span className="text-green-600 ml-2">In Stock ({v.stock})</span>
            : <span className="text-red-500 ml-2">Out of Stock</span>
          }
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* COLOR SELECTOR */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a]">
            Color
          </p>
          {selectedColor && (
            <span className="text-xs text-[#666] capitalize">{selectedColor}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          {colors.map(({ color, colorHex, hasStock }) => (
            <button
              key={color}
              onClick={() => !disabled && setSelectedColor(color)}
              disabled={disabled}
              title={color}
              aria-label={`${color}${!hasStock ? " (out of stock)" : ""}`}
              aria-pressed={selectedColor === color}
              className={`relative w-9 h-9 rounded-full border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a96e] focus-visible:ring-offset-2 disabled:cursor-not-allowed
                ${selectedColor === color
                  ? "border-[#1a1a1a] scale-110 shadow-md"
                  : "border-transparent hover:border-[#999] hover:scale-105"
                }
                ${!hasStock ? "opacity-40" : ""}
              `}
            >
              {/* Color fill */}
              <span
                className="absolute inset-[3px] rounded-full block"
                style={{ backgroundColor: colorHex }}
              />
              {/* Out of stock slash */}
              {!hasStock && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="block w-px h-8 bg-[#999] rotate-45 opacity-70" />
                </span>
              )}
              {/* Selected checkmark */}
              {selectedColor === color && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 10 10" className="w-2 h-2 text-white fill-none stroke-current stroke-2">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* SIZE SELECTOR */}
      {sizesForColor.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a]">
              Size
            </p>
            {selectedSize && selectedVariant && (
              <span className="text-xs text-[#666]">{selectedSize}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {sizesForColor.map(({ size, stock }) => {
              const outOfStock = stock === 0;
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  onClick={() => !disabled && !outOfStock && setSelectedSize(size)}
                  disabled={disabled || outOfStock}
                  aria-label={`${size}${outOfStock ? " (out of stock)" : ""}`}
                  aria-pressed={isSelected}
                  className={`relative min-w-[48px] px-3 py-2 text-xs tracking-[1px] uppercase font-medium border transition-all duration-150
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a96e] focus-visible:ring-offset-1
                    ${isSelected
                      ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                      : outOfStock
                        ? "border-[#e0d8ce] text-[#ccc] cursor-not-allowed bg-[#fafaf9]"
                        : "border-[#d0c8be] text-[#333] hover:border-[#1a1a1a] hover:bg-[#f0ebe3]"
                    }
                  `}
                >
                  {size}
                  {/* Diagonal strike through for OOS */}
                  {outOfStock && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="block w-px h-full bg-[#ddd] rotate-45 absolute" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STOCK STATUS */}
      {selectedVariant && (
        <div className="flex items-center gap-2 text-xs">
          {selectedVariant.stock > 0 ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-green-700 font-medium">
                {selectedVariant.stock <= 5
                  ? `Only ${selectedVariant.stock} left — order soon`
                  : "In Stock"}
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={13} className="text-red-500 shrink-0" />
              <span className="text-red-600 font-medium">Out of Stock</span>
            </>
          )}
        </div>
      )}

      {/* SELECTION PROMPT */}
      {selectedColor && !selectedSize && sizesForColor.length > 1 && (
        <p className="text-xs text-[#c9a96e] flex items-center gap-1.5 font-medium">
          <span className="inline-block w-1 h-1 rounded-full bg-[#c9a96e]" />
          Please select a size to continue
        </p>
      )}
    </div>
  );
}