import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Package,
} from "lucide-react";
import reviewService from "../../services/reviewService.js";
import toast from "react-hot-toast";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const APPROVAL_OPTIONS = [
  { value: "", label: "All Reviews" },
  { value: "false", label: "Pending" },
  { value: "true", label: "Approved" },
];

const LIMIT = 15;

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={
            s <= rating
              ? "text-[#c9a96e] fill-[#c9a96e]"
              : "text-[#ddd]"
          }
        />
      ))}
    </div>
  );
}

export default function ReviewModerationPage() {
  const queryClient = useQueryClient();
  const [isApproved, setIsApproved] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "reviews", { page, limit: LIMIT, isApproved }],
    queryFn: () =>
      reviewService.getAllReviewsAdmin({
        page,
        limit: LIMIT,
        isApproved: isApproved !== "" ? isApproved : undefined,
      }),
    keepPreviousData: true,
    staleTime: 30 * 1000,
  });

  const reviews = data?.reviews || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "pending-reviews"] });
  };

  const { mutate: approve, isPending: approving } = useMutation({
    mutationFn: (id) => reviewService.approveReview(id),
    onSuccess: () => {
      invalidate();
      toast.success("Review approved.");
    },
    onError: (err) => toast.error(err.message || "Could not approve review."),
  });

  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: (id) => reviewService.rejectReview(id),
    onSuccess: () => {
      invalidate();
      toast.success("Review rejected.");
    },
    onError: (err) => toast.error(err.message || "Could not reject review."),
  });

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id) => reviewService.deleteReview(id),
    onSuccess: () => {
      invalidate();
      toast.success("Review deleted.");
    },
    onError: (err) => toast.error(err.message || "Could not delete review."),
  });

  const handleDelete = (id, productName) => {
    if (!window.confirm(`Permanently delete this review for "${productName}"?`)) return;
    remove(id);
  };

  const handleFilter = (e) => {
    setIsApproved(e.target.value);
    setPage(1);
  };

  const actionBusy = approving || rejecting || deleting;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">
          Review Moderation
        </h1>
        <p className="text-xs text-[#888] mt-1">
          {total} review{total !== 1 ? "s" : ""} — approve or reject customer feedback
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={isApproved}
          onChange={handleFilter}
          className="border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white"
        >
          {APPROVAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`bg-white border border-[#e8e0d4] overflow-hidden transition-opacity ${
          isFetching && !isLoading ? "opacity-70" : "opacity-100"
        }`}
      >
        {isLoading ? (
          <div className="divide-y divide-[#f0ebe3]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-5 animate-pulse space-y-3">
                <div className="h-3 w-2/5 bg-[#ece8e0] rounded-full" />
                <div className="h-2.5 w-4/5 bg-[#ece8e0] rounded-full" />
                <div className="h-2.5 w-3/5 bg-[#ece8e0] rounded-full" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center">
            <Star size={28} className="mx-auto text-[#ccc] mb-3" />
            <p className="text-sm text-[#888]">No reviews found.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0ebe3]">
            {reviews.map((review) => {
              const productName = review.product?.name || "Unknown product";
              const userName = review.user?.name || "Unknown user";

              return (
                <div
                  key={review._id}
                  className="px-5 py-5 hover:bg-[#f9f7f4] transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span
                          className={`text-[9px] tracking-[1.5px] uppercase font-bold px-2 py-0.5 ${
                            review.isApproved
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {review.isApproved ? "Approved" : "Pending"}
                        </span>
                        <span className="text-xs text-[#aaa]">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      {review.title && (
                        <p className="text-sm font-semibold text-[#1a1a1a]">
                          {review.title}
                        </p>
                      )}
                      <p className="text-sm text-[#555] leading-relaxed line-clamp-3">
                        {review.body}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#888]">
                        <span className="flex items-center gap-1.5">
                          <User size={12} className="text-[#bbb]" />
                          {userName}
                          {review.user?.email && (
                            <span className="text-[#bbb]">· {review.user.email}</span>
                          )}
                        </span>
                        <Link
                          to={`/products/${review.product?.slug}`}
                          className="flex items-center gap-1.5 hover:text-[#c9a96e] transition-colors"
                        >
                          <Package size={12} className="text-[#bbb]" />
                          {productName}
                        </Link>
                        {review.order?.orderNumber && (
                          <span className="font-mono text-[#aaa]">
                            {review.order.orderNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!review.isApproved && (
                        <button
                          onClick={() => approve(review._id)}
                          disabled={actionBusy}
                          title="Approve"
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                      )}
                      {review.isApproved && (
                        <button
                          onClick={() => reject(review._id)}
                          disabled={actionBusy}
                          title="Reject"
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(review._id, productName)}
                        disabled={actionBusy}
                        title="Delete"
                        className="p-2 text-[#bbb] hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#888]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
