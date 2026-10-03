import Link from "next/link";
import { categoryLabel } from "@/lib/constants";
import { formatKoreanDateTime } from "@/lib/time";
import { formatPoints } from "@/lib/utils";
import type { Errand } from "@/lib/supabase/types";
import { StatusBadge, UrgentBadge } from "./status-badge";

export function ActivityRow({ errand }: { errand: Errand }) {
  return (
    <Link
      href={`/errands/${errand.id}`}
      className="flex flex-col gap-1.5 rounded-2xl border border-gray-100 bg-white p-4"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {categoryLabel(errand.category)}
        </span>
        <UrgentBadge level={errand.urgent_level} />
        <StatusBadge status={errand.status} />
      </div>
      <h3 className="line-clamp-1 text-sm font-bold text-gray-900">{errand.title}</h3>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatKoreanDateTime(errand.created_at)}</span>
        <span className="font-semibold text-[#3B5BFD]">{formatPoints(errand.price)}</span>
      </div>
    </Link>
  );
}
