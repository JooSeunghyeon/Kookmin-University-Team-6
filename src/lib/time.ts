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

const KST_TIME_ZONE = "Asia/Seoul";

/**
 * KST(UTC+9) 기준으로 날짜·시각을 표시한다. 서버 렌더링 환경(Vercel)의 기본 시간대는 UTC이므로
 * timeZone을 명시하지 않으면 "ko-KR" 로케일이어도 시각 자체가 9시간 어긋나게 표시된다.
 */
export function formatKoreanDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    timeZone: KST_TIME_ZONE,
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
