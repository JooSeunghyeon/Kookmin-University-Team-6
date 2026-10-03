"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelErrandButton({ errandId }: { errandId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCancel() {
    if (!confirm("정말 이 의뢰를 취소할까요? 결제한 포인트는 환불돼요.")) return;

    setIsSubmitting(true);
    const response = await fetch(`/api/errands/${errandId}/cancel`, { method: "POST" });

    if (response.ok) {
      router.refresh();
    } else {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isSubmitting}
      className="text-center text-sm font-medium text-gray-400 underline disabled:opacity-40"
    >
      의뢰 취소하기
    </button>
  );
}
