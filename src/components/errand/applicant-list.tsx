"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Application, PublicProfile } from "@/lib/supabase/types";

export interface ApplicationWithProfile extends Application {
  profile: PublicProfile | null;
}

export function ApplicantList({
  errandId,
  applications,
}: {
  errandId: string;
  applications: ApplicationWithProfile[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectApplicant(applicationId: string) {
    setPendingId(applicationId);
    setError(null);

    const response = await fetch(`/api/errands/${errandId}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "선택에 실패했어요.");
      setPendingId(null);
      return;
    }

    router.refresh();
  }

  if (applications.length === 0) {
    return (
      <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
        아직 지원자가 없어요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-[#F04452]">{error}</p>}
      {applications.map((application) => (
        <div
          key={application.id}
          className="flex items-center justify-between rounded-xl border border-gray-100 p-3"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {application.profile?.nickname ?? "알 수 없음"}
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                {application.profile?.campus_temp.toFixed(1)}°C · 완료 {application.profile?.completed_count}회
              </span>
            </p>
            {application.message && (
              <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{application.message}</p>
            )}
          </div>
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg bg-[#3B5BFD] px-3 text-sm font-semibold text-white disabled:opacity-40"
            onClick={() => selectApplicant(application.id)}
            disabled={pendingId !== null}
          >
            {pendingId === application.id ? "선택 중..." : "선택"}
          </button>
        </div>
      ))}
    </div>
  );
}
