"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

interface ChatEntryButtonProps {
  errandId: string;
  /** 의뢰자가 아직 선택하지 않은 지원자와 매칭 전 대화를 열 때 지정한다(E 단계: 지원자 소통). */
  partnerId?: string;
  label?: string;
  variant?: "primary" | "compact";
}

export function ChatEntryButton({ errandId, partnerId, label = "채팅하기", variant = "primary" }: ChatEntryButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/chat/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partnerId ? { errandId, partnerId } : { errandId }),
    });
    const body = await response.json();

    if (!response.ok) {
      const message = body.error ?? "채팅방을 열 수 없어요.";
      setError(message);
      setIsLoading(false);
      if (variant === "compact") window.alert(message);
      return;
    }

    router.push(`/chat/${body.roomId}`);
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 disabled:opacity-40"
      >
        <MessageCircle size={16} />
        {isLoading ? "여는 중..." : label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="btn-h flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-base font-semibold text-white disabled:opacity-40"
      >
        <MessageCircle size={18} />
        {isLoading ? "여는 중..." : label}
      </button>
      {error && <p className="text-xs text-[#F04452]">{error}</p>}
    </div>
  );
}
