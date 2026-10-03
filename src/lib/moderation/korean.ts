const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JUNGSEONG_COUNT = 21;
const JONGSEONG_COUNT = 28;

const CHOSEONG_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

function choseongOf(syllable: number): string {
  const offset = syllable - HANGUL_BASE;
  const choseongIndex = Math.floor(offset / (JUNGSEONG_COUNT * JONGSEONG_COUNT));
  return CHOSEONG_LIST[choseongIndex] ?? "";
}

/** 한글 음절을 초성만 남긴 문자열로 바꾼다. 검열 우회(띄어쓰기·자모 분해 등) 탐지에 쓰인다. */
export function extractChoseong(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const isHangulSyllable = code >= HANGUL_BASE && code <= HANGUL_LAST;
    if (isHangulSyllable) {
      result += choseongOf(code);
    }
  }
  return result;
}
