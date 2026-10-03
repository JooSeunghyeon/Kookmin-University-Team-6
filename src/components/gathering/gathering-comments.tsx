"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { formatKoreanDateTime } from "@/lib/time";

export interface GatheringCommentWithAuthor {
  id: string;
  content: string;
  created_at: string;
  authorNickname: string | null;
}

export function GatheringComments({
  gatheringId,
  comments,
}: {
  gatheringId: string;
  comments: GatheringCommentWithAuthor[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (content.trim().length === 0) return;
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/gatherings/${gatheringId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "댓글 등록에 실패했어요.");
      setIsSubmitting(false);
      return;
    }

    setContent("");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-900">댓글 {comments.length}개</h2>

      {comments.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">첫 댓글을 남겨 보세요.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-semibold text-gray-600">{comment.authorNickname ?? "알 수 없음"}</span>
                <span>{formatKoreanDateTime(comment.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="댓글을 입력하세요"
          maxLength={300}
          className="h-11 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#3B5BFD]"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || content.trim().length === 0}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3B5BFD] text-white disabled:opacity-40"
          aria-label="댓글 등록"
        >
          <Send size={16} />
        </button>
      </div>
      {error && <p className="text-xs text-[#F04452]">{error}</p>}
    </div>
  );
}
