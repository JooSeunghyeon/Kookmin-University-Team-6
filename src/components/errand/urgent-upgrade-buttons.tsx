"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { URGENT_LEVEL_FEE } from "@/lib/constants";

export function UrgentUpgradeButtons({ errandId }: { errandId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<1 | 2 | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upgrade(level: 1 | 2) {
    setIsSubmitting(level);
    setError(null);
    const response = await fetch(`/api/errands/${errandId}/urgent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "긴급 옵션 적용에 실패했어요.");
      setIsSubmitting(null);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#F04452]/20 bg-[#F04452]/5 p-4">
      <p className="text-sm font-semibold text-[#F04452]">더 빨리 매칭되고 싶다면?</p>
      {error && <p className="text-xs text-[#F04452]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => upgrade(1)}
          disabled={isSubmitting !== null}
          className="flex-1 rounded-xl border border-[#F04452] bg-white py-2 text-sm font-semibold text-[#F04452] disabled:opacity-40"
        >
          긴급 (+{URGENT_LEVEL_FEE[1]}P)
        </button>
        <button
          type="button"
          onClick={() => upgrade(2)}
          disabled={isSubmitting !== null}
          className="flex-1 rounded-xl bg-[#F04452] py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          긴급 플러스 (+{URGENT_LEVEL_FEE[2]}P)
        </button>
      </div>
    </div>
  );
}
