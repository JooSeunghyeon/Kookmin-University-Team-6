import { ERRAND_STATUS_LABEL, type ErrandStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ErrandStatus, string> = {
  RECRUITING: "bg-[#3B5BFD]/10 text-[#3B5BFD]",
  SELECTING: "bg-amber-50 text-amber-600",
  MATCHED: "bg-emerald-50 text-emerald-600",
  CONFIRMING: "bg-violet-50 text-violet-600",
  COMPLETED: "bg-gray-100 text-gray-500",
  EXPIRED: "bg-gray-100 text-gray-400",
  CANCELLED: "bg-gray-100 text-gray-400",
  DISPUTED: "bg-[#F04452]/10 text-[#F04452]",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status as ErrandStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLE[key] ?? "bg-gray-100 text-gray-500",
      )}
    >
      {ERRAND_STATUS_LABEL[key] ?? status}
    </span>
  );
}

export function UrgentBadge({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[#F04452]/10 px-2.5 py-1 text-xs font-semibold text-[#F04452]">
      {level === 2 ? "긴급 플러스" : "긴급"}
    </span>
  );
}
