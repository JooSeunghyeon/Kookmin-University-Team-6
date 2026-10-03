"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REVIEW_TAGS } from "@/lib/constants";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";
import { StarRating } from "@/components/ui/star-rating";
import type { Review } from "@/lib/supabase/types";

interface ConfirmReviewPanelProps {
  errandId: string;
  status: string;
  existingReview: Review | null;
}

export function ConfirmReviewPanel({ errandId, status, existingReview }: ConfirmReviewPanelProps) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  async function handleConfirmOnly() {
    setIsSubmitting(true);
    setError(null);
    const response = await fetch(`/api/errands/${errandId}/confirm`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "완료 확인에 실패했어요.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
  }

  async function handleSubmitReview() {
    setIsSubmitting(true);
    setError(null);
    const response = await fetch(`/api/errands/${errandId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, tags, comment: comment || undefined }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "후기 작성에 실패했어요.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
  }

  if (existingReview) {
    return (
      <div className="rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-900">내가 남긴 후기</h3>
        <div className="mt-1">
          <StarRating rating={existingReview.rating} size={18} />
        </div>
        {existingReview.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {existingReview.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        )}
        {existingReview.comment && <p className="mt-2 text-sm text-gray-600">{existingReview.comment}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-900">
        {status === "CONFIRMING" ? "완료를 확인해 주세요" : "후기를 남겨 주세요"}
      </h3>

      <StarRating rating={rating} onRate={setRating} size={28} />

      <div className="flex flex-wrap gap-1.5">
        {REVIEW_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              tags.includes(tag)
                ? "border-[#3B5BFD] bg-[#3B5BFD]/10 text-[#3B5BFD]"
                : "border-gray-200 text-gray-500"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <textarea
        className="h-20 rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#3B5BFD]"
        placeholder="후기를 남겨 주세요 (선택)"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={300}
      />

      {error && <p className="text-xs text-[#F04452]">{error}</p>}

      <div className="flex gap-2">
        {status === "CONFIRMING" && (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={handleConfirmOnly}
            disabled={isSubmitting}
          >
            후기 없이 확인만
          </button>
        )}
        <button type="button" className={primaryButtonClass} onClick={handleSubmitReview} disabled={isSubmitting}>
          {isSubmitting ? "제출 중..." : "후기 남기고 완료"}
        </button>
      </div>
    </div>
  );
}
