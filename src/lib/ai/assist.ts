import { callClaudeJson } from "@/lib/ai/claude";
import { haversineMeters } from "@/lib/geo";
import {
  AI_LUNCH_PEAK_HOURS,
  AI_LUNCH_PEAK_SURCHARGE,
  AI_PRICE_DISTANCE_INCREMENT,
  AI_PRICE_DISTANCE_UNIT_METERS,
  AI_PRICE_RANGE_MARGIN,
  ERRAND_CATEGORIES,
  MIN_ERRAND_PRICE,
  type ErrandCategory,
} from "@/lib/constants";
import type { CampusPlace } from "@/lib/supabase/types";

export interface AiAssistResult {
  title: string;
  body: string;
  category: ErrandCategory;
  fromLabel: string | null;
  toLabel: string | null;
  detail: string;
  desiredAt: string;
  suggestedPrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
  reasoning: string;
  urgentRecommended: boolean;
  source: "ai" | "rule";
}

interface RequestAssistParams {
  rawInput: string;
  places: CampusPlace[];
  nowIso: string;
}

const CATEGORY_KEYWORDS: Record<ErrandCategory, string[]> = {
  meal: ["학식", "밥", "식사", "음식", "배달", "포장", "커피", "음료"],
  print: ["프린트", "출력", "복사", "인쇄", "제본"],
  parcel: ["택배", "우편", "등기", "편지"],
  pickup: ["픽업", "가져다", "가져와", "찾아다", "수령"],
  moving: ["짐", "이사", "옮기", "운반"],
  etc: [],
};

const URGENT_KEYWORDS = ["지금", "바로", "급해요", "급함", "빨리", "서둘러", "asap"];

function findCategory(text: string): ErrandCategory {
  const lower = text.toLowerCase();
  for (const category of ERRAND_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category.value];
    if (keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      return category.value;
    }
  }
  return "etc";
}

function findMentionedPlaces(text: string, places: CampusPlace[]): CampusPlace[] {
  const matched: CampusPlace[] = [];
  for (const place of places) {
    if (text.includes(place.name) && !matched.some((item) => item.id === place.id)) {
      matched.push(place);
    }
  }
  return matched;
}

function isLunchPeak(desiredAt: string): boolean {
  const hour = new Date(desiredAt).getHours();
  return hour >= AI_LUNCH_PEAK_HOURS[0] && hour < AI_LUNCH_PEAK_HOURS[1];
}

function calculatePrice(fromPlace: CampusPlace | undefined, toPlace: CampusPlace | undefined, desiredAt: string) {
  const distanceMeters =
    fromPlace && toPlace ? haversineMeters(fromPlace, toPlace) : 0;
  const distanceUnits = Math.ceil(distanceMeters / AI_PRICE_DISTANCE_UNIT_METERS);
  const distanceFee = distanceUnits * AI_PRICE_DISTANCE_INCREMENT;
  const peakFee = isLunchPeak(desiredAt) ? AI_LUNCH_PEAK_SURCHARGE : 0;
  const suggestedPrice = MIN_ERRAND_PRICE + distanceFee + peakFee;

  const reasonParts = [`기본가 ${MIN_ERRAND_PRICE.toLocaleString("ko-KR")}P`];
  if (distanceFee > 0) {
    reasonParts.push(`거리 약 ${Math.round(distanceMeters)}m(+${distanceFee.toLocaleString("ko-KR")}P)`);
  }
  if (peakFee > 0) {
    reasonParts.push(`점심 피크 시간(+${peakFee.toLocaleString("ko-KR")}P)`);
  }

  return {
    suggestedPrice,
    priceRangeMin: suggestedPrice,
    priceRangeMax: suggestedPrice + AI_PRICE_RANGE_MARGIN,
    reasoning: reasonParts.join(" + "),
  };
}

function defaultDesiredAtFrom(nowIso: string, rawInput: string): string {
  const isUrgent = URGENT_KEYWORDS.some((keyword) => rawInput.toLowerCase().includes(keyword));
  const offsetMs = isUrgent ? 30 * 60 * 1000 : 60 * 60 * 1000;
  return new Date(new Date(nowIso).getTime() + offsetMs).toISOString();
}

/** Claude 호출이 실패하거나 시간 초과될 때 쓰는 규칙 기반 폴백. */
function ruleBasedAssist({ rawInput, places, nowIso }: RequestAssistParams): AiAssistResult {
  const category = findCategory(rawInput);
  const mentionedPlaces = findMentionedPlaces(rawInput, places);
  const [fromPlace, toPlace] = mentionedPlaces;
  const desiredAt = defaultDesiredAtFrom(nowIso, rawInput);
  const { suggestedPrice, priceRangeMin, priceRangeMax, reasoning } = calculatePrice(fromPlace, toPlace, desiredAt);
  const isUrgent = URGENT_KEYWORDS.some((keyword) => rawInput.toLowerCase().includes(keyword));
  const firstLine = rawInput.split(/[\n.!?]/)[0]?.trim() || rawInput.trim();

  return {
    title: firstLine.slice(0, 40) || "의뢰 제목을 입력해 주세요",
    body: rawInput.trim(),
    category,
    fromLabel: fromPlace?.name ?? null,
    toLabel: toPlace?.name ?? null,
    detail: "",
    desiredAt,
    suggestedPrice,
    priceRangeMin,
    priceRangeMax,
    reasoning: `AI 연결에 실패해 규칙 기반으로 추천했어요. ${reasoning}`,
    urgentRecommended: isUrgent,
    source: "rule",
  };
}

interface ClaudeAssistResponse {
  title: string;
  body: string;
  category: string;
  fromLabel: string | null;
  toLabel: string | null;
  detail: string;
  desiredAt: string;
  urgentRecommended: boolean;
}

function buildPrompt(rawInput: string, places: CampusPlace[], nowIso: string): { system: string; prompt: string } {
  const placeNames = places.map((place) => place.name).join(", ");
  const categoryValues = ERRAND_CATEGORIES.map((category) => category.value).join(", ");

  const system = [
    "너는 대학 캠퍼스 심부름 매칭 서비스 '캠퍼스런'의 글쓰기 도우미야.",
    "사용자가 자유롭게 쓴 심부름 요청 메모를 받아 아래 JSON 스키마로만 응답해.",
    "다른 설명, 인사말, 마크다운 없이 JSON 객체 하나만 출력해.",
    `category는 다음 중 하나여야 해: ${categoryValues}.`,
    `fromLabel/toLabel은 아래 장소 목록에 있는 이름과 정확히 같을 때만 채우고, 모르면 null로 둬: ${placeNames || "(장소 없음)"}.`,
    `현재 시각은 ${nowIso} (한국 표준시) 기준이야. "오늘 저녁 7시", "지금 바로" 같은 상대 표현은 이 시각을 기준으로 ISO 8601 절대 시각으로 변환해.`,
    'JSON 스키마: {"title": string, "body": string, "category": string, "fromLabel": string|null, "toLabel": string|null, "detail": string, "desiredAt": string(ISO8601), "urgentRecommended": boolean}',
  ].join("\n");

  const prompt = `사용자 입력:\n${rawInput}`;

  return { system, prompt };
}

export async function requestAiAssist(params: RequestAssistParams): Promise<AiAssistResult> {
  const { rawInput, places, nowIso } = params;

  try {
    const { system, prompt } = buildPrompt(rawInput, places, nowIso);
    const aiResult = await callClaudeJson<ClaudeAssistResponse>({ system, prompt });

    const category = ERRAND_CATEGORIES.some((item) => item.value === aiResult.category)
      ? (aiResult.category as ErrandCategory)
      : findCategory(rawInput);
    const fromPlace = places.find((place) => place.name === aiResult.fromLabel);
    const toPlace = places.find((place) => place.name === aiResult.toLabel);
    const desiredAt = Number.isNaN(new Date(aiResult.desiredAt).getTime())
      ? defaultDesiredAtFrom(nowIso, rawInput)
      : new Date(aiResult.desiredAt).toISOString();

    const { suggestedPrice, priceRangeMin, priceRangeMax, reasoning } = calculatePrice(fromPlace, toPlace, desiredAt);

    return {
      title: aiResult.title?.slice(0, 40) || rawInput.slice(0, 40),
      body: aiResult.body?.trim() || rawInput.trim(),
      category,
      fromLabel: fromPlace?.name ?? null,
      toLabel: toPlace?.name ?? null,
      detail: aiResult.detail ?? "",
      desiredAt,
      suggestedPrice,
      priceRangeMin,
      priceRangeMax,
      reasoning,
      urgentRecommended: Boolean(aiResult.urgentRecommended),
      source: "ai",
    };
  } catch {
    return ruleBasedAssist(params);
  }
}
