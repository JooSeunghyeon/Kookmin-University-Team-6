import Link from "next/link";
import { categoryLabel } from "@/lib/constants";
import { formatPoints } from "@/lib/utils";
import type { Errand } from "@/lib/supabase/types";
import { CountdownBadge } from "./countdown-badge";
import { UrgentBadge } from "./status-badge";

export function ErrandCard({ errand }: { errand: Errand }) {
  return (
    <Link
      href={`/errands/${errand.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
          {categoryLabel(errand.category)}
        </span>
        <UrgentBadge level={errand.urgent_level} />
      </div>

      <h3 className="line-clamp-1 text-base font-bold text-gray-900">{errand.title}</h3>
      <p className="line-clamp-1 text-sm text-gray-500">{errand.from_label ?? "장소 미지정"}</p>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-lg font-bold text-[#3B5BFD]">{formatPoints(errand.price)}</span>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>지원 {errand.applicant_count}명</span>
          <span aria-hidden>·</span>
          <CountdownBadge deadlineIso={errand.recruit_deadline_at} prefix="마감까지" />
        </div>
      </div>
    </Link>
  );
}
