import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { gatheringCategoryLabel, GATHERING_STATUS_LABEL } from "@/lib/constants";
import { formatKoreanDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Gathering } from "@/lib/supabase/types";

const CLOSING_SOON_MS = 24 * 60 * 60 * 1000;

function isClosingSoon(gathering: Gathering): boolean {
  if (gathering.status !== "OPEN" || !gathering.meet_at) return false;
  const remaining = new Date(gathering.meet_at).getTime() - Date.now();
  return remaining > 0 && remaining <= CLOSING_SOON_MS;
}

export function GatheringCard({ gathering }: { gathering: Gathering }) {
  const isFull = gathering.member_count >= gathering.capacity;

  return (
    <Link
      href={`/gatherings/${gathering.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
          {gatheringCategoryLabel(gathering.category)}
        </span>
        {gathering.status !== "OPEN" && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-400">
            {GATHERING_STATUS_LABEL[gathering.status]}
          </span>
        )}
        {isClosingSoon(gathering) && (
          <span className="flex items-center gap-1 rounded-full bg-[#F04452]/10 px-2.5 py-1 text-xs font-semibold text-[#F04452]">
            <Clock size={11} />
            마감 임박
          </span>
        )}
      </div>

      <h3 className="line-clamp-1 text-base font-bold text-gray-900">{gathering.title}</h3>
      <p className="line-clamp-1 text-sm text-gray-500">
        {gathering.place_label ?? "장소 미정"}
        {gathering.meet_at ? ` · ${formatKoreanDateTime(gathering.meet_at)}` : ""}
      </p>

      <div className="mt-1 flex items-center justify-between">
        <span className={cn("flex items-center gap-1 text-sm font-bold", isFull ? "text-gray-400" : "text-[#3B5BFD]")}>
          <Users size={15} />
          {gathering.member_count}/{gathering.capacity}명
        </span>
      </div>
    </Link>
  );
}
