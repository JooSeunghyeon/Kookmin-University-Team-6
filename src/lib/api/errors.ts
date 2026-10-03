import { NextResponse } from "next/server";

const RPC_ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: "사용자 정보를 확인할 수 없어요.",
  USER_SUSPENDED: "이용이 제한된 계정이에요.",
  PRICE_TOO_LOW: "금액은 1,000P 이상이어야 해요.",
  URGENT_DAILY_LIMIT: "긴급 옵션은 하루 3회까지만 사용할 수 있어요.",
  INSUFFICIENT_POINTS: "포인트가 부족해요.",
  ERRAND_NOT_FOUND: "의뢰를 찾을 수 없어요.",
  RECRUIT_CLOSED: "모집이 마감된 의뢰예요.",
  CANNOT_APPLY_OWN: "내가 작성한 의뢰에는 지원할 수 없어요.",
  NOT_REQUESTER: "의뢰 작성자만 할 수 있어요.",
  NOT_SELECTABLE: "지금은 수행자를 선택할 수 없는 상태예요.",
  APPLICATION_NOT_FOUND: "지원 정보를 찾을 수 없어요.",
  NOT_IN_PROGRESS: "진행 중인 의뢰가 아니에요.",
  NOT_CONFIRMING: "완료 확인 대기 상태가 아니에요.",
  NOT_REVIEWABLE: "지금은 후기를 남길 수 없어요.",
  NOT_CANCELLABLE: "지금은 취소할 수 없는 상태예요.",
  NOT_UPGRADABLE: "지금은 긴급 옵션을 적용할 수 없어요.",
  MODERATION_BLOCKED: "블라인드 처리된 의뢰예요.",
  CANNOT_INQUIRE_OWN: "내가 작성한 의뢰에는 문의할 수 없어요.",
  INQUIRY_CLOSED: "문의할 수 있는 기간이 아니에요.",
  INQUIRY_NOT_FOUND: "문의를 찾을 수 없어요.",
  ALREADY_ANSWERED: "이미 답변한 문의예요.",
  ROOM_NOT_FOUND: "채팅방을 찾을 수 없어요.",
  NOT_PARTICIPANT: "채팅방 참여자가 아니에요.",
  USE_PARTNER_FLOW: "잘못된 채팅 요청이에요.",
  NOT_ADMIN: "관리자만 할 수 있어요.",
  REPORT_NOT_FOUND: "신고 내역을 찾을 수 없어요.",
  UNKNOWN_ACTION: "알 수 없는 처리예요.",
  NICKNAME_COOLDOWN: "닉네임은 30일에 한 번만 바꿀 수 있어요.",
  FORBIDDEN: "권한이 없어요.",
  INVALID_LOCATION_TYPE: "위치 방식을 확인해 주세요.",
  GATHERING_NOT_FOUND: "모임을 찾을 수 없어요.",
  GATHERING_CLOSED: "모집이 마감된 모임이에요.",
  ALREADY_JOINED: "이미 참여 중인 모임이에요.",
  GATHERING_FULL: "정원이 가득 찼어요.",
  HOST_CANNOT_LEAVE: "모임장은 탈퇴할 수 없어요. 모임을 마감해 주세요.",
  NOT_MEMBER: "참여 중인 모임이 아니에요.",
  INVALID_CATEGORY: "카테고리를 확인해 주세요.",
  INVALID_CAPACITY: "정원은 2명에서 100명 사이여야 해요.",
};

/** 클라이언트 입력 오류(400) vs 상태/권한 오류(409)를 가르는 코드만 별도로 표시한다. */
const CLIENT_INPUT_CODES = new Set(["PRICE_TOO_LOW"]);

export function rpcErrorResponse(error: { message?: string } | null, fallback = "요청을 처리할 수 없어요.") {
  const message = error?.message ?? "";
  for (const [code, label] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (message.includes(code)) {
      return NextResponse.json({ error: label }, { status: CLIENT_INPUT_CODES.has(code) ? 400 : 409 });
    }
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
}
