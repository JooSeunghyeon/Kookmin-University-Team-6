export interface PiiMaskResult {
  maskedText: string;
  foundTypes: string[];
}

const PHONE_PATTERN = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g;
const BANK_ACCOUNT_PATTERN = /\b\d{2,6}[-\s]\d{2,6}[-\s]?\d{2,8}\b/g;
const LONG_DIGIT_RUN_PATTERN = /\b\d{10,16}\b/g;
const KAKAO_ID_PATTERN = /(카카오\s?톡|카톡|open\s?kakao|오픈\s?카톡)\s*(아이디|id)?\s*[:：]?\s*[a-zA-Z0-9_.-]{3,20}/gi;

/**
 * 전화번호 · 계좌번호 · 카카오톡 ID로 보이는 부분을 "***"로 치환한다.
 * 채팅·의뢰·후기 등 저장되는 모든 텍스트에 적용해 외부 거래 유도를 줄인다.
 *
 * 주의: 전역(/g) 정규식의 test()/exec()는 lastIndex를 그대로 들고 있어 모듈 수준 상수를
 * 여러 요청에서 재사용하면 상태가 어긋난다. replace()는 Symbol.replace 처리 과정에서
 * lastIndex를 0으로 재설정하므로, "바꾸기 전/후 문자열을 비교"하는 방식으로만 매칭 여부를 판단한다.
 */
export function maskPersonalInfo(text: string): PiiMaskResult {
  const foundTypes: string[] = [];
  let working = text;

  const afterPhone = working.replace(PHONE_PATTERN, "***");
  if (afterPhone !== working) foundTypes.push("phone");
  working = afterPhone;

  const afterKakao = working.replace(KAKAO_ID_PATTERN, "***");
  if (afterKakao !== working) foundTypes.push("kakao_id");
  working = afterKakao;

  const afterAccount = working.replace(BANK_ACCOUNT_PATTERN, "***");
  if (afterAccount !== working) foundTypes.push("bank_account");
  working = afterAccount;

  const afterDigitRun = working.replace(LONG_DIGIT_RUN_PATTERN, "***");
  if (afterDigitRun !== working && !foundTypes.includes("bank_account")) foundTypes.push("bank_account");
  working = afterDigitRun;

  return { maskedText: working, foundTypes };
}
