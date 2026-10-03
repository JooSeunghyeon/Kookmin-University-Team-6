"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";

interface ApplySheetProps {
  errandId: string;
  onClose: () => void;
}

export function ApplySheet({ errandId, onClose }: ApplySheetProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/errands/${errandId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "지원에 실패했어요.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-white p-5 pb-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
        <h2 className="text-lg font-bold text-gray-900">이 의뢰에 지원할까요?</h2>
        <p className="mt-1 text-sm text-gray-500">
          간단한 인사말을 남기면 선택될 확률이 높아져요.
        </p>

        <textarea
          className="mt-4 h-24 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#3B5BFD]"
          placeholder="예: 지금 바로 출발할 수 있어요!"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={300}
        />
        {error && <p className="mt-2 text-xs text-[#F04452]">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
            취소
          </button>
          <button type="button" className={primaryButtonClass} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "지원 중..." : "지원하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
