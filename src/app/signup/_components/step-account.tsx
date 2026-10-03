"use client";

import { useMemo, useState } from "react";
import {
  FormField,
  inputBaseClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/form-field";
import type { SignupFormState } from "./types";

interface StepAccountProps {
  form: SignupFormState;
  onChange: (patch: Partial<SignupFormState>) => void;
  onNext: () => void;
  onBack: () => void;
}

function validate(form: SignupFormState): string | null {
  if (form.emailLocalPart.trim().length === 0) {
    return "학교 이메일 아이디를 입력해 주세요.";
  }
  if (form.password.length < 8) {
    return "비밀번호는 8자 이상이어야 해요.";
  }
  if (form.password !== form.passwordConfirm) {
    return "비밀번호가 서로 달라요.";
  }
  return null;
}

export function StepAccount({ form, onChange, onNext, onBack }: StepAccountProps) {
  const [touched, setTouched] = useState(false);
  const error = useMemo(() => (touched ? validate(form) : null), [touched, form]);

  function handleNext() {
    setTouched(true);
    if (!validate(form)) {
      onNext();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">계정 정보를 입력해 주세요</h1>
        <p className="mt-1 text-sm text-gray-500">{form.schoolName} 이메일로 가입해요.</p>
      </div>

      <FormField label="학교 이메일">
        <div className="flex items-center gap-2">
          <input
            className={`${inputBaseClass} flex-1`}
            placeholder="아이디"
            value={form.emailLocalPart}
            onChange={(event) => onChange({ emailLocalPart: event.target.value })}
            autoComplete="off"
          />
          <span className="whitespace-nowrap text-sm text-gray-500">@{form.schoolDomain}</span>
        </div>
      </FormField>

      <FormField label="비밀번호">
        <input
          type="password"
          className={inputBaseClass}
          placeholder="8자 이상"
          value={form.password}
          onChange={(event) => onChange({ password: event.target.value })}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label="비밀번호 확인" error={error ?? undefined}>
        <input
          type="password"
          className={inputBaseClass}
          placeholder="비밀번호를 다시 입력해 주세요"
          value={form.passwordConfirm}
          onChange={(event) => onChange({ passwordConfirm: event.target.value })}
          autoComplete="new-password"
        />
      </FormField>

      <div className="flex gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onBack}>
          이전
        </button>
        <button type="button" className={primaryButtonClass} onClick={handleNext}>
          다음
        </button>
      </div>
    </div>
  );
}
