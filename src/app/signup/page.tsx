"use client";

import { useState } from "react";
import Link from "next/link";
import { generateRandomNickname } from "@/lib/nickname";
import { StepSchool } from "./_components/step-school";
import { StepAccount } from "./_components/step-account";
import { StepIdentity } from "./_components/step-identity";
import { StepNickname } from "./_components/step-nickname";
import { INITIAL_SIGNUP_FORM, type SchoolOption, type SignupFormState } from "./_components/types";

const STEP_COUNT = 4;

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: STEP_COUNT }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 w-6 rounded-full transition ${
            index <= step ? "bg-[#3B5BFD]" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SignupFormState>({
    ...INITIAL_SIGNUP_FORM,
    nickname: generateRandomNickname(),
  });

  function patchForm(patch: Partial<SignupFormState>) {
    setForm((previous) => ({ ...previous, ...patch }));
  }

  function selectSchool(school: SchoolOption) {
    patchForm({ schoolId: school.id, schoolName: school.name, schoolDomain: school.email_domain });
  }

  function goNext() {
    setStep((current) => Math.min(current + 1, STEP_COUNT - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-6 px-5 py-8">
      <ProgressDots step={step} />

      {step === 0 && (
        <StepSchool selectedSchoolId={form.schoolId} onSelect={selectSchool} onNext={goNext} />
      )}
      {step === 1 && (
        <StepAccount form={form} onChange={patchForm} onNext={goNext} onBack={goBack} />
      )}
      {step === 2 && (
        <StepIdentity form={form} onChange={patchForm} onNext={goNext} onBack={goBack} />
      )}
      {step === 3 && <StepNickname form={form} onChange={patchForm} onBack={goBack} />}

      <p className="text-center text-sm text-gray-400">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-medium text-[#3B5BFD]">
          로그인
        </Link>
      </p>
    </main>
  );
}
