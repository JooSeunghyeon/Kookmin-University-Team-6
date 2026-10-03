"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, inputBaseClass, primaryButtonClass } from "@/components/ui/form-field";

const COOLDOWN_DAYS = 30;

export function NicknameForm({ currentNickname, nicknameChangedAt }: { currentNickname: string; nicknameChangedAt: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(currentNickname);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [now] = useState(() => Date.now());
  const nextAvailableAt = new Date(new Date(nicknameChangedAt).getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const onCooldown = nextAvailableAt.getTime() > now;

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const response = await fetch("/api/me/nickname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "닉네임 변경에 실패했어요.");
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <FormField label="닉네임" error={error ?? undefined}>
        <input
          className={inputBaseClass}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={20}
          disabled={onCooldown}
        />
      </FormField>
      {onCooldown && (
        <p className="text-xs text-gray-400">
          닉네임은 {nextAvailableAt.toLocaleDateString("ko-KR")} 이후에 다시 바꿀 수 있어요.
        </p>
      )}
      {success && <p className="text-xs text-[#3B5BFD]">닉네임이 변경되었어요.</p>}
      <button
        type="button"
        className={primaryButtonClass}
        onClick={handleSubmit}
        disabled={isSubmitting || onCooldown || nickname.trim() === currentNickname}
      >
        {isSubmitting ? "변경 중..." : "닉네임 변경"}
      </button>
    </div>
  );
}
