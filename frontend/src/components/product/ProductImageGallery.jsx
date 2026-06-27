import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";

// ─────────────────────────────────────────────
// PRODUCT IMAGE GALLERY
// Full-featured image gallery for the product
// detail page. Features:
//   • Main image with thumbnail strip
//   • Keyboard arrow navigation
//   • Lightbox / fullscreen zoom modal
//   • Touch swipe (via pointer events)
//   • Smooth crossfade transitions
//
// Props:
//   images — [{ url, alt, isPrimary, _id }]
//   productName — used for alt text fallback
// ─────────────────────────────────────────────
export default function ProductImageGallery({ images = [], productName = "" }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pointerStart, setPointerStart] = useState(null);

  // Sort: primary first
  const sorted = [...images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  const total = sorted.length;
  const active = sorted[activeIdx];

  const prev = useCallback(() => {
    setActiveIdx((i) => (i === 0 ? total - 1 : i - 1));
  }, [total]);

  const next = useCallback(() => {
    setActiveIdx((i) => (i === total - 1 ? 0 : i + 1));
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, prev, next]);

  // Lock body scroll in lightbox
  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  // Pointer/touch swipe
  const handlePointerDown = (e) => setPointerStart(e.clientX);
  const handlePointerUp = (e) => {
    if (pointerStart === null) return;
    const delta = e.clientX - pointerStart;
    if (Math.abs(delta) > 40) {
      delta < 0 ? next() : prev();
    }
    setPointerStart(null);
  };

  if (total === 0) {
    return (
      <div className="aspect-square bg-[#f0ebe3] flex items-center justify-center rounded-sm">
        <span className="text-[#ccc] text-sm">No image</span>
      </div>
    );
  }

  return (
    <>
      {/* Gallery layout */}
      <div className="flex flex-col-reverse sm:flex-row gap-3">

        {/* Thumbnail strip — vertical on sm+, horizontal scroll on mobile */}
        {total > 1 && (
          <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[520px] pb-1 sm:pb-0 sm:pr-1 scrollbar-thin scrollbar-thumb-[#ddd]">
            {sorted.map((img, idx) => (
              <button
                key={img._id || idx}
                onClick={() => setActiveIdx(idx)}
                className={`shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] overflow-hidden border-2 transition-all duration-150 ${
                  activeIdx === idx
                    ? "border-[#1a1a1a]"
                    : "border-transparent hover:border-[#ccc]"
                }`}
                aria-label={`View image ${idx + 1}`}
                aria-pressed={activeIdx === idx}
              >
                <img
                  src={img.url}
                  alt={img.alt || `${productName} ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div className="relative flex-1">
          <div
            className="relative aspect-square sm:aspect-[4/5] overflow-hidden bg-[#f4f1ec] cursor-zoom-in select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onClick={() => setLightboxOpen(true)}
          >
            <img
              key={active?.url}
              src={active?.url}
              alt={active?.alt || productName}
              className="w-full h-full object-cover transition-opacity duration-300"
              loading="eager"
              draggable={false}
            />

            {/* Zoom hint */}
            <div className="absolute bottom-3 right-3 bg-white/90 text-[#555] p-1.5 rounded-full opacity-0 group-hover:opacity-100 pointer-events-none">
              <ZoomIn size={16} />
            </div>

            {/* Arrow nav — shown when multiple images */}
            {total > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {/* Dot indicators — mobile only */}
          {total > 1 && (
            <div className="flex justify-center gap-1.5 mt-3 sm:hidden">
              {sorted.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    activeIdx === idx ? "bg-[#1a1a1a] w-4" : "bg-[#ccc]"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
            aria-label="Close lightbox"
          >
            <X size={24} />
          </button>

          {/* Image counter */}
          {total > 1 && (
            <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-xs tracking-[2px]">
              {activeIdx + 1} / {total}
            </span>
          )}

          {/* Image */}
          <div
            className="relative max-w-3xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            <img
              src={active?.url}
              alt={active?.alt || productName}
              className="max-h-[85vh] max-w-full object-contain"
              draggable={false}
            />
          </div>

          {/* Lightbox arrows */}
          {total > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Next image"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Lightbox thumbnails */}
          {total > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {sorted.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setActiveIdx(idx); }}
                  className={`w-10 h-10 overflow-hidden border-2 transition-all ${
                    activeIdx === idx ? "border-[#c9a96e]" : "border-white/20 hover:border-white/50"
                  }`}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}