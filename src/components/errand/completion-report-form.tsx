"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { primaryButtonClass } from "@/components/ui/form-field";

export function CompletionReportForm({ errandId }: { errandId: string }) {
  const router = useRouter();
  const [memo, setMemo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    let photoUrl: string | undefined;
    if (file) {
      const supabase = createClient();
      const path = `${errandId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("proofs").upload(path, file);
      if (uploadError) {
        setError("사진 업로드에 실패했어요.");
        setIsSubmitting(false);
        return;
      }
      const { data } = supabase.storage.from("proofs").getPublicUrl(path);
      photoUrl = data.publicUrl;
    }

    const response = await fetch(`/api/errands/${errandId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl, memo: memo || undefined }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "완료 보고에 실패했어요.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-900">완료 보고하기</h3>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="text-sm text-gray-500"
      />
      <textarea
        className="h-20 rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#3B5BFD]"
        placeholder="완료 메모를 남겨 주세요 (선택)"
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        maxLength={300}
      />
      {error && <p className="text-xs text-[#F04452]">{error}</p>}
      <button type="button" className={primaryButtonClass} onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "보고 중..." : "완료 보고하기"}
      </button>
    </div>
  );
}
