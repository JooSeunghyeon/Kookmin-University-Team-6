"use client";

import { useMemo, useState } from "react";
import {
  FormField,
  inputBaseClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/form-field";
import type { SignupFormState } from "./types";

interface StepIdentityProps {
  form: SignupFormState;
  onChange: (patch: Partial<SignupFormState>) => void;
  onNext: () => void;
  onBack: () => void;
}

function validate(form: SignupFormState): string | null {
  if (form.realName.trim().length < 2) {
    return "실명을 입력해 주세요.";
  }
  if (form.studentNo.trim().length < 4) {
    return "학번을 입력해 주세요.";
  }
  return null;
}

export function StepIdentity({ form, onChange, onNext, onBack }: StepIdentityProps) {
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
        <h1 className="text-xl font-bold">본인 확인 정보를 입력해 주세요</h1>
        <p className="mt-1 text-sm text-gray-500">
          실명·학번은 암호화되어 저장되고, 다른 학생에게는 절대 공개되지 않아요.
        </p>
      </div>

      <FormField label="실명">
        <input
          className={inputBaseClass}
          placeholder="홍길동"
          value={form.realName}
          onChange={(event) => onChange({ realName: event.target.value })}
        />
      </FormField>

      <FormField label="학번">
        <input
          className={inputBaseClass}
          placeholder="20231234"
          value={form.studentNo}
          onChange={(event) => onChange({ studentNo: event.target.value })}
        />
      </FormField>

      <FormField label="학과 (선택)" error={error ?? undefined}>
        <input
          className={inputBaseClass}
          placeholder="예: 소프트웨어학부"
          value={form.department}
          onChange={(event) => onChange({ department: event.target.value })}
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
