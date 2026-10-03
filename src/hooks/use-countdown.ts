"use client";

import { useEffect, useState } from "react";
import { formatCountdown, msUntil } from "@/lib/time";

export interface CountdownState {
  msRemaining: number;
  label: string;
  isPast: boolean;
}

/**
 * Ticks every second and compares against the deadline directly on the
 * client, independent of the pg_cron sweep — matches F-14's requirement
 * that the UI never waits for the server to disable an expired action.
 */
export function useCountdown(deadlineIso: string | null): CountdownState {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!deadlineIso) return;

    const intervalId = setInterval(() => {
      forceTick((tick) => tick + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [deadlineIso]);

  const msRemaining = msUntil(deadlineIso);

  return {
    msRemaining,
    label: formatCountdown(msRemaining),
    isPast: msRemaining <= 0,
  };
}
