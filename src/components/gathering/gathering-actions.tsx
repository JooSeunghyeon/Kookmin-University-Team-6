"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GatheringActionsProps {
  gatheringId: string;
  isHost: boolean;
  isMember: boolean;
  isFull: boolean;
  isOpen: boolean;
}

export function GatheringActions({ gatheringId, isHost, isMember, isFull, isOpen }: GatheringActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAction(action: "join" | "leave" | "close") {
    setIsPending(true);
    setError(null);

    const response = await fetch(`/api/gatherings/${gatheringId}/${action}`, { method: "POST" });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "처리에 실패했어요.");
      setIsPending(false);
      return;
    }

    router.refresh();
    setIsPending(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-[#F04452]">{error}</p>}
      {isHost ? (
        isOpen && (
          <button
            type="button"
            onClick={() => callAction("close")}
            disabled={isPending}
            className="btn-h w-full rounded-xl border border-gray-200 text-base font-semibold text-gray-600 disabled:opacity-40"
          >
            모집 마감하기
          </button>
        )
      ) : isMember ? (
        <button
          type="button"
          onClick={() => callAction("leave")}
          disabled={isPending}
          className="btn-h w-full rounded-xl border border-gray-200 text-base font-semibold text-gray-600 disabled:opacity-40"
        >
          {isPending ? "처리 중..." : "모임 탈퇴하기"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => callAction("join")}
          disabled={isPending || !isOpen || isFull}
          className="btn-h w-full rounded-xl bg-[#3B5BFD] text-base font-semibold text-white disabled:opacity-40"
        >
          {isPending ? "처리 중..." : isFull ? "정원이 가득 찼어요" : !isOpen ? "모집이 마감됐어요" : "참여하기"}
        </button>
      )}
    </div>
  );
}
