import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ActivityRow } from "@/components/errand/activity-row";
import type { Errand } from "@/lib/supabase/types";

interface RequestModeDashboardProps {
  nickname: string;
  myErrands: Errand[];
}

export function RequestModeDashboard({ nickname, myErrands }: RequestModeDashboardProps) {
  return (
    <div className="flex flex-col gap-4 px-5">
      <p className="text-sm text-gray-500">{nickname}님, 어떤 심부름이 필요하세요?</p>

      <Link
        href="/errands/new"
        className="flex items-center justify-between rounded-2xl bg-[#8B5CF6] px-5 py-4 text-white shadow-sm"
      >
        <span className="flex items-center gap-2 text-base font-bold">
          <Sparkles size={20} />
          AI로 의뢰 작성하기
        </span>
        <span className="text-sm opacity-80">바로 시작 ›</span>
      </Link>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-gray-900">내가 등록한 의뢰</h2>
        {myErrands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
            아직 등록한 의뢰가 없어요. 첫 의뢰를 올려보세요!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myErrands.map((errand) => (
              <ActivityRow key={errand.id} errand={errand} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
