"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChatEntryButtonProps {
  errandId: string;
}

export function ChatEntryButton({ errandId }: ChatEntryButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/chat/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errandId }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "채팅방을 열 수 없어요.");
      setIsLoading(false);
      return;
    }

    router.push(`/chat/${body.roomId}`);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="btn-h w-full rounded-xl bg-gray-900 text-base font-semibold text-white disabled:opacity-40"
      >
        {isLoading ? "여는 중..." : "💬 채팅하기"}
      </button>
      {error && <p className="text-xs text-[#F04452]">{error}</p>}
    </div>
  );
}
