"use client";

import { useCountdown } from "@/hooks/use-countdown";

interface CountdownBadgeProps {
  deadlineIso: string | null;
  prefix: string;
  pastLabel?: string;
}

export function CountdownBadge({ deadlineIso, prefix, pastLabel = "마감" }: CountdownBadgeProps) {
  const { label, isPast } = useCountdown(deadlineIso);

  return (
    <span className={isPast ? "text-gray-400" : "text-[#3B5BFD]"}>
      {isPast ? pastLabel : `${prefix} ${label}`}
    </span>
  );
}
