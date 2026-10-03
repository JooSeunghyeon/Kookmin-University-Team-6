/**
 * 1차 규칙 기반 검열. 닉네임·짧은 텍스트에 쓰는 최소 버전이며, 의뢰·채팅 본문 전체를
 * 다루는 2차 Claude 검열(`ai` 단계의 moderate.ts)이 이를 그대로 재사용하며 확장한다.
 *
 * 주의: 완성형 문장 전체를 초성으로 분해해 2글자 패턴을 찾으면 "해주실 분"(실+분 → ㅅㅂ)처럼
 * 정상적인 문장에서도 우연히 금칙 초성과 같은 배열이 나와 오탐이 발생한다. 그래서 초성 검사는
 * 완성형 음절을 분해하지 않고, 사용자가 필터 회피를 위해 실제로 입력한 "낱자(자음만)"
 * 문자(ㅅㅂ, ㅄ, ㅈㄹ 등)가 원문에 그대로 있는 경우만 잡는다.
 */

const SEPARATOR_PATTERN = /[\s\-_.!@#$%^&*()~`'"+=<>,/\\|:;[\]{}]/g;

const BANNED_SUBSTRINGS = [
  "씨발", "시발", "병신", "개새끼", "지랄", "좆", "꺼져", "죽어버려",
  "관리자", "운영자", "admin", "administrator", "공식계정", "campusrun",
];

const BANNED_JAMO_PATTERN = /ㅅㅂ|ㅄ|ㅈㄹ/;

// 학업 부정행위(대리출석·대리시험·과제 대행 등) 요청에 흔히 쓰이는 한글·로마자 표현.
// AI 검열(moderate.ts) 2차 판정 이전에 명백한 경우를 빠르게 걸러내기 위한 1차 규칙이다.
const ACADEMIC_DISHONESTY_SUBSTRINGS = [
  "대리출석", "대리시험", "대리응시", "과제대행", "출석대리", "시험대리",
  "daeri", "chulseok", "attendanceproxy", "examproxy", "assignmenthelp", "takemyexam",
];

function normalize(text: string): string {
  return text.replace(SEPARATOR_PATTERN, "").toLowerCase();
}

function hasBannedSubstring(normalized: string): boolean {
  return BANNED_SUBSTRINGS.some((word) => normalized.includes(word));
}

function hasBannedJamo(text: string): boolean {
  return BANNED_JAMO_PATTERN.test(text);
}

export function containsBannedWord(text: string): boolean {
  const normalized = normalize(text);
  return hasBannedSubstring(normalized) || hasBannedJamo(text);
}

export function containsAcademicDishonestyKeyword(text: string): boolean {
  const normalized = normalize(text);
  return ACADEMIC_DISHONESTY_SUBSTRINGS.some((word) => normalized.includes(word));
}
