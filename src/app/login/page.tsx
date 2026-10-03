"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FormField, inputBaseClass, primaryButtonClass } from "@/components/ui/form-field";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("이메일 또는 비밀번호가 올바르지 않아요.");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-5 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#3B5BFD]">캠퍼스런</h1>
        <p className="mt-1 text-sm text-gray-500">우리 학교 학생이 대신 해드려요</p>
      </div>

      <div className="flex flex-col gap-4">
        <FormField label="학교 이메일">
          <input
            className={inputBaseClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="example@kookmin.ac.kr"
          />
        </FormField>

        <FormField label="비밀번호" error={error ?? undefined}>
          <input
            className={inputBaseClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
          />
        </FormField>

        <button
          type="button"
          className={primaryButtonClass}
          onClick={handleSubmit}
          disabled={isSubmitting || !email || !password}
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </div>

      <p className="text-center text-sm text-gray-400">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="font-medium text-[#3B5BFD]">
          회원가입
        </Link>
      </p>
    </main>
  );
}
