export const RECRUIT_WINDOW_MS = 2 * 60 * 60 * 1000;
export const SELECT_WINDOW_MS = 3 * 60 * 60 * 1000;
export const CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000;

export const PLATFORM_FEE_RATE = 0.1;
export const RUNNER_PAYOUT_RATE = 0.9;

export const SIGNUP_BONUS_POINTS = 10000;
export const MIN_ERRAND_PRICE = 1000;

export const URGENT_LEVEL_FEE: Record<1 | 2, number> = {
  1: 100,
  2: 500,
};
export const URGENT_LEVEL1_EXPOSURE_MS = 30 * 60 * 1000;
export const URGENT_DAILY_LIMIT = 3;
export const URGENT_EXPIRE_REFUND_RATE = 0.5;

export const WALK_METERS_PER_MINUTE = 67;
export const CAMPUS_RADIUS_METERS = 2000;

export const NICKNAME_CHANGE_COOLDOWN_DAYS = 30;

export const ERRAND_CATEGORIES = [
  { value: "meal", label: "학식" },
  { value: "print", label: "프린트" },
  { value: "parcel", label: "택배" },
  { value: "pickup", label: "픽업" },
  { value: "moving", label: "짐옮기기" },
  { value: "etc", label: "기타" },
] as const;

export type ErrandCategory = (typeof ERRAND_CATEGORIES)[number]["value"];

export const ERRAND_STATUS = {
  RECRUITING: "RECRUITING",
  SELECTING: "SELECTING",
  MATCHED: "MATCHED",
  CONFIRMING: "CONFIRMING",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED",
} as const;

export type ErrandStatus = (typeof ERRAND_STATUS)[keyof typeof ERRAND_STATUS];

export const ERRAND_STATUS_LABEL: Record<ErrandStatus, string> = {
  RECRUITING: "모집 중",
  SELECTING: "수행자 선택 중",
  MATCHED: "진행 중",
  CONFIRMING: "완료 확인 대기",
  COMPLETED: "완료",
  EXPIRED: "기간 만료",
  CANCELLED: "취소됨",
  DISPUTED: "확인 중",
};

export const APPLICATION_STATUS = {
  APPLIED: "APPLIED",
  SELECTED: "SELECTED",
  NOT_SELECTED: "NOT_SELECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;

export const MODERATION_STATUS = {
  VISIBLE: "visible",
  WARNED: "warned",
  BLINDED: "blinded",
} as const;

export const AI_VERDICT = {
  PASS: "PASS",
  WARN: "WARN",
  BLOCK: "BLOCK",
  BLIND: "BLIND",
} as const;

export const USER_STATUS = {
  ACTIVE: "active",
  RESTRICTED: "restricted",
  SUSPENDED: "suspended",
  BANNED: "banned",
} as const;

export const REPORT_REASON = [
  { value: "ACADEMIC", label: "학업 부정행위 요청" },
  { value: "SEXUAL", label: "성적 불쾌감" },
  { value: "ABUSE", label: "욕설·비하" },
  { value: "ILLEGAL", label: "불법·위험 물품" },
  { value: "SCAM", label: "사기·외부 거래 유도" },
  { value: "NO_SHOW", label: "약속 불이행(노쇼)" },
  { value: "ETC", label: "기타" },
] as const;

export const REVIEW_TAGS = [
  "시간 약속을 잘 지켜요",
  "친절해요",
  "응답이 빨라요",
  "설명이 꼼꼼해요",
  "다시 부탁하고 싶어요",
] as const;

export const CAMPUS_TEMP_START = 36.5;
export const CAMPUS_TEMP_DELTA: Record<number, number> = {
  5: 0.5,
  4: 0.3,
  3: 0.1,
  2: -0.3,
  1: -0.5,
};

export const COLORS = {
  brand: "#3B5BFD",
  urgent: "#F04452",
  ai: "#8B5CF6",
} as const;

export const SCHOOL_SEED = [
  {
    name: "국민대학교",
    email_domain: "kookmin.ac.kr",
    center_lat: 37.6108,
    center_lng: 126.9975,
  },
  {
    name: "서울대학교",
    email_domain: "snu.ac.kr",
    center_lat: 37.4596,
    center_lng: 126.9519,
  },
] as const;

export const CLAUDE_TIMEOUT_MS = 8000;
export const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

export const AI_PRICE_DISTANCE_UNIT_METERS = 100;
export const AI_PRICE_DISTANCE_INCREMENT = 100;
export const AI_LUNCH_PEAK_HOURS: readonly [number, number] = [11, 14];
export const AI_LUNCH_PEAK_SURCHARGE = 300;
export const AI_PRICE_RANGE_MARGIN = 500;

export const POINT_TRANSACTION_LABEL: Record<string, string> = {
  CHARGE: "충전",
  ESCROW_HOLD: "의뢰 등록(보관)",
  PAYOUT: "수행 보상",
  REFUND: "환불",
  FEE: "수수료",
  URGENT_FEE: "긴급 옵션",
  URGENT_REFUND: "긴급 옵션 환급",
  WITHDRAW: "출금",
};

export function categoryLabel(value: string): string {
  return ERRAND_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}
