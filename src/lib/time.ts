import {
  CONFIRM_WINDOW_MS,
  RECRUIT_WINDOW_MS,
  SELECT_WINDOW_MS,
} from "@/lib/constants";

export function recruitDeadlineFrom(createdAt: Date): Date {
  return new Date(createdAt.getTime() + RECRUIT_WINDOW_MS);
}

export function selectDeadlineFrom(recruitEndAt: Date): Date {
  return new Date(recruitEndAt.getTime() + SELECT_WINDOW_MS);
}

export function confirmDeadlineFrom(reportedAt: Date): Date {
  return new Date(reportedAt.getTime() + CONFIRM_WINDOW_MS);
}

export function isPast(isoString: string | null): boolean {
  if (!isoString) return false;
  return new Date(isoString).getTime() <= Date.now();
}

export function msUntil(isoString: string | null): number {
  if (!isoString) return Infinity;
  return new Date(isoString).getTime() - Date.now();
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "마감";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  if (minutes > 0) {
    return `${minutes}분 ${seconds}초`;
  }
  return `${seconds}초`;
}

export function formatKoreanDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
