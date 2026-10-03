"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { generateRandomNickname } from "@/lib/nickname";
import { createClient } from "@/lib/supabase/client";
import {
  FormField,
  inputBaseClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/form-field";
import type { SignupFormState } from "./types";

interface StepNicknameProps {
  form: SignupFormState;
  onChange: (patch: Partial<SignupFormState>) => void;
  onBack: () => void;
}

async function submitSignup(form: SignupFormState): Promise<{ email: string } | { error: string }> {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolId: form.schoolId,
      emailLocalPart: form.emailLocalPart,
      password: form.password,
      realName: form.realName,
      studentNo: form.studentNo,
      department: form.department || undefined,
      nickname: form.nickname,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    return { error: body.error ?? "회원가입에 실패했어요." };
  }
  return { email: body.email };
}

export function StepNickname({ form, onChange, onBack }: StepNicknameProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function rollNickname() {
    onChange({ nickname: generateRandomNickname() });
  }

  async function handleSubmit() {
    if (form.nickname.trim().length < 2) {
      setError("닉네임을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await submitSignup(form);
    if ("error" in result) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.email,
      password: form.password,
    });

    if (signInError) {
      setError("가입은 완료됐지만 로그인에 실패했어요. 로그인 화면에서 다시 시도해 주세요.");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">닉네임을 정해 주세요</h1>
        <p className="mt-1 text-sm text-gray-500">
          실명 대신 이 닉네임으로 다른 학생에게 보여져요. 주사위를 눌러 새로 뽑을 수 있어요.
        </p>
      </div>

      <FormField label="닉네임" error={error ?? undefined}>
        <div className="flex items-center gap-2">
          <input
            className={`${inputBaseClass} flex-1`}
            value={form.nickname}
            onChange={(event) => onChange({ nickname: event.target.value })}
            placeholder="예: 졸린 수달 42"
          />
          <button
            type="button"
            onClick={rollNickname}
            className="btn-h flex aspect-square items-center justify-center rounded-xl border border-gray-200 text-gray-600"
            aria-label="닉네임 다시 뽑기"
          >
            <Shuffle size={20} />
          </button>
        </div>
      </FormField>

      <div className="flex gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={onBack}
          disabled={isSubmitting}
        >
          이전
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "가입 중..." : "가입 완료"}
        </button>
      </div>
    </div>
  );
}
