"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKoreanDateTime } from "@/lib/time";
import { inputBaseClass, primaryButtonClass } from "@/components/ui/form-field";
import type { InquiryFeedRow } from "@/lib/supabase/types";

export interface InquiryWithAuthor extends InquiryFeedRow {
  authorNickname: string | null;
}

interface InquirySectionProps {
  errandId: string;
  isRequester: boolean;
  canInquire: boolean;
  inquiries: InquiryWithAuthor[];
}

export function InquirySection({ errandId, isRequester, canInquire, inquiries }: InquirySectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-900">문의 {inquiries.length}개</h2>

      {inquiries.length === 0 && <p className="text-xs text-gray-400">아직 문의가 없어요.</p>}

      {inquiries.map((inquiry) => (
        <InquiryRow key={inquiry.id} inquiry={inquiry} isRequester={isRequester} />
      ))}

      {canInquire && <NewInquiryForm errandId={errandId} />}
    </section>
  );
}

function InquiryRow({ inquiry, isRequester }: { inquiry: InquiryWithAuthor; isRequester: boolean }) {
  const isHiddenSecret = inquiry.content === null;

  return (
    <div className="rounded-xl border border-gray-100 p-3 text-sm">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {inquiry.is_secret && "🔒 "}
          {inquiry.authorNickname ?? "익명"}
        </span>
        <span>{formatKoreanDateTime(inquiry.created_at)}</span>
      </div>

      {isHiddenSecret ? (
        <p className="mt-1 text-gray-400">비밀 문의입니다.</p>
      ) : (
        <p className="mt-1 text-gray-700">{inquiry.content}</p>
      )}

      {inquiry.answer && (
        <div className="mt-2 rounded-lg bg-gray-50 p-2 text-gray-600">
          <span className="font-semibold text-[#3B5BFD]">답변</span> {inquiry.answer}
        </div>
      )}

      {isRequester && !inquiry.answer && !isHiddenSecret && <InquiryAnswerForm inquiryId={inquiry.id} />}
    </div>
  );
}

function InquiryAnswerForm({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/inquiries/${inquiryId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "답변 등록에 실패했어요.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <input
        className="h-9 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-[#3B5BFD]"
        placeholder="답변을 입력해 주세요"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        maxLength={500}
      />
      {error && <p className="text-xs text-[#F04452]">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || answer.trim().length === 0}
        className="h-9 self-start rounded-lg bg-[#3B5BFD] px-3 text-xs font-semibold text-white disabled:opacity-40"
      >
        {isSubmitting ? "등록 중..." : "답변 등록"}
      </button>
    </div>
  );
}

function NewInquiryForm({ errandId }: { errandId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/errands/${errandId}/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, isSecret }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "문의 등록에 실패했어요.");
      setIsSubmitting(false);
      return;
    }

    setContent("");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-100 p-3">
      <textarea
        className={`${inputBaseClass} h-auto py-2`}
        placeholder="궁금한 점을 물어보세요"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={500}
      />
      <label className="flex items-center gap-1.5 text-xs text-gray-500">
        <input type="checkbox" checked={isSecret} onChange={(event) => setIsSecret(event.target.checked)} />
        비밀 문의로 등록 (작성자와 나만 볼 수 있어요)
      </label>
      {error && <p className="text-xs text-[#F04452]">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || content.trim().length < 2}
        className={primaryButtonClass}
      >
        {isSubmitting ? "등록 중..." : "문의하기"}
      </button>
    </div>
  );
}
