import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ThumbsUp, User, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import reviewService from "../../services/reviewService.js";
import useAuthStore from "../../store/authStore.js";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// ─────────────────────────────────────────────
// STAR RATING INPUT
// ─────────────────────────────────────────────
function StarInput({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-pressed={value === star}
          className="p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a96e] rounded-sm disabled:cursor-not-allowed"
        >
          <Star
            size={22}
            className={`transition-colors duration-100 ${
              star <= display
                ? "fill-[#c9a96e] text-[#c9a96e]"
                : "fill-[#e8e0d4] text-[#e8e0d4]"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1 text-xs text-[#888]">
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// RATING BREAKDOWN BAR
// ─────────────────────────────────────────────
function RatingBreakdown({ distribution = {}, total = 0, average = 0 }) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 p-5 bg-[#f9f7f4] border border-[#ece8e0]">
      {/* Average score */}
      <div className="flex flex-col items-center justify-center sm:border-r sm:border-[#ece8e0] sm:pr-8 sm:min-w-[120px]">
        <span className="text-5xl font-serif text-[#1a1a1a] leading-none">
          {Number(average).toFixed(1)}
        </span>
        <div className="flex items-center gap-0.5 mt-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={14}
              className={
                s <= Math.round(average)
                  ? "fill-[#c9a96e] text-[#c9a96e]"
                  : "fill-[#e0d8ce] text-[#e0d8ce]"
              }
            />
          ))}
        </div>
        <p className="text-xs text-[#888] mt-1">{total} review{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Star bars */}
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2.5">
              <span className="text-xs text-[#888] w-3 text-right shrink-0">{star}</span>
              <Star size={10} className="text-[#c9a96e] fill-[#c9a96e] shrink-0" />
              <div className="flex-1 h-1.5 bg-[#ece8e0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#c9a96e] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-[#aaa] w-6 shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SINGLE REVIEW CARD
// ─────────────────────────────────────────────
function ReviewCard({ review }) {
  const { rating, title, body, user, createdAt } = review;

  return (
    <article className="py-5 border-b border-[#f0ebe3] last:border-b-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#e8e0d4] flex items-center justify-center shrink-0">
            <User size={14} className="text-[#888]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1a1a1a]">
              {user?.name || "Verified Buyer"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CheckCircle size={11} className="text-green-500" />
              <span className="text-[10px] text-green-600 font-medium">Verified Purchase</span>
            </div>
          </div>
        </div>
        <time className="text-[11px] text-[#aaa] shrink-0">{formatDate(createdAt)}</time>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={13}
            className={
              s <= rating
                ? "fill-[#c9a96e] text-[#c9a96e]"
                : "fill-[#e0d8ce] text-[#e0d8ce]"
            }
          />
        ))}
      </div>

      {/* Title + body */}
      {title && (
        <p className="text-sm font-semibold text-[#1a1a1a] mb-1">{title}</p>
      )}
      <p className="text-sm text-[#555] leading-relaxed">{body}</p>
    </article>
  );
}

// ─────────────────────────────────────────────
// REVIEW SUBMIT FORM
// ─────────────────────────────────────────────
function ReviewForm({ productId, onSuccess }) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      reviewService.submitReview(productId, { rating, title, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      setSubmitted(true);
      onSuccess?.();
      toast.success("Your review has been submitted for approval.");
    },
    onError: (err) => {
      toast.error(err.message || "Could not submit review.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    if (body.trim().length < 10) {
      toast.error("Review must be at least 10 characters.");
      return;
    }
    mutate();
  };

  if (!isAuthenticated) {
    return (
      <div className="p-5 bg-[#f9f7f4] border border-[#ece8e0] text-center">
        <p className="text-sm text-[#555] mb-3">
          Sign in to share your experience with this product.
        </p>
        <a
          href="/login"
          className="inline-block text-xs tracking-[1.5px] uppercase font-semibold bg-[#1a1a1a] text-white px-5 py-2.5 hover:bg-[#c9a96e] transition-colors"
        >
          Sign In to Review
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-5 bg-[#f0faf4] border border-green-200 flex items-start gap-3">
        <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800">Review submitted!</p>
          <p className="text-xs text-green-700 mt-0.5">
            Your review is pending approval and will appear shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] mb-2">
          Your Rating *
        </p>
        <StarInput value={rating} onChange={setRating} disabled={isPending} />
      </div>

      <div>
        <label className="text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] block mb-2">
          Review Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarise your experience"
          maxLength={100}
          disabled={isPending}
          className="w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] disabled:bg-[#f9f7f4] disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] block mb-2">
          Your Review *
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell others about the quality, size, colour accuracy…"
          rows={4}
          maxLength={1000}
          disabled={isPending}
          className="w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] resize-none disabled:bg-[#f9f7f4] disabled:cursor-not-allowed"
        />
        <p className="text-[10px] text-[#bbb] text-right mt-1">
          {body.length}/1000
        </p>
      </div>

      <div className="flex items-start gap-2 text-xs text-[#888]">
        <AlertCircle size={12} className="shrink-0 mt-0.5 text-[#c9a96e]" />
        <span>
          Only customers with a delivered order containing this product can submit reviews.
          Reviews are visible after admin approval.
        </span>
      </div>

      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="w-full sm:w-auto bg-[#1a1a1a] text-white text-xs tracking-[1.5px] uppercase font-semibold px-8 py-3 hover:bg-[#c9a96e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────
// PRODUCT REVIEW LIST
//
// Main export — renders:
//   • Rating breakdown summary
//   • Paginated list of approved reviews
//   • Review submission form
//
// Props:
//   productId     — MongoDB product _id
//   averageRating — from product object (for breakdown)
//   reviewCount   — from product object
// ─────────────────────────────────────────────
export default function ProductReviewList({ productId, averageRating = 0, reviewCount = 0 }) {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const LIMIT = 5;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reviews", productId, page],
    queryFn: () =>
      reviewService.getProductReviews(productId, { page, limit: LIMIT }),
    enabled: Boolean(productId),
    keepPreviousData: true,
    staleTime: 3 * 60 * 1000,
  });

  const reviews = data?.reviews || [];
  const total = data?.total || reviewCount;
  const totalPages = data?.totalPages || 1;
  const ratingDistribution = data?.ratingDistribution || {};

  return (
    <section aria-label="Product reviews">

      {/* Section heading */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-serif text-[#1a1a1a]">
          Customer Reviews
          {total > 0 && (
            <span className="ml-2 text-sm text-[#888] font-sans font-normal">
              ({total})
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] border border-[#1a1a1a] px-4 py-2 hover:bg-[#1a1a1a] hover:text-white transition-colors flex items-center gap-2"
        >
          <Star size={13} />
          Write a Review
        </button>
      </div>

      {/* Rating breakdown */}
      {total > 0 && (
        <div className="mb-6">
          <RatingBreakdown
            distribution={ratingDistribution}
            total={total}
            average={averageRating}
          />
        </div>
      )}

      {/* Write a review — expandable */}
      {showForm && (
        <div className="mb-8 p-5 border border-[#e0d8ce] bg-white">
          <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4 tracking-wide">
            Share Your Experience
          </h3>
          <ReviewForm
            productId={productId}
            onSuccess={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Review list */}
      {isLoading ? (
        <div className="space-y-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="py-5 border-b border-[#f0ebe3] animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#ece8e0]" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-28 bg-[#ece8e0] rounded-full" />
                  <div className="h-2.5 w-20 bg-[#ece8e0] rounded-full" />
                </div>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="w-3.5 h-3.5 bg-[#ece8e0] rounded-full" />
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-[#ece8e0] rounded-full" />
                <div className="h-3 w-4/5 bg-[#ece8e0] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[#888]">Could not load reviews. Please try again.</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-[#e0d8ce]">
          <Star size={28} className="mx-auto text-[#ddd] mb-3" />
          <p className="text-sm text-[#888]">No reviews yet.</p>
          <p className="text-xs text-[#bbb] mt-1">
            Be the first to share your experience!
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-xs tracking-[1.5px] uppercase font-semibold text-[#c9a96e] hover:text-[#1a1a1a] transition-colors"
          >
            Write a Review
          </button>
        </div>
      ) : (
        <>
          <div>
            {reviews.map((review) => (
              <ReviewCard key={review._id} review={review} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-[#888]">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-xs border transition-colors ${
                        page === pageNum
                          ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                          : "border-[#d0c8be] text-[#555] hover:border-[#1a1a1a]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Load more (alternative to pagination for mobile) */}
          {page < totalPages && (
            <div className="mt-4 text-center sm:hidden">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-2 mx-auto text-xs text-[#555] hover:text-[#1a1a1a] transition-colors"
              >
                Load more reviews
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}