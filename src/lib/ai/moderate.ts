import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeJson } from "@/lib/ai/claude";
import { containsAcademicDishonestyKeyword, containsBannedWord } from "@/lib/moderation/basic-filter";
import { maskPersonalInfo } from "@/lib/moderation/pii-mask";
import { AI_VERDICT } from "@/lib/constants";

export type ModerationTargetType =
  | "errand"
  | "application"
  | "inquiry"
  | "chat_message"
  | "nickname"
  | "review"
  | "gathering"
  | "gathering_comment";
export type ModerationVerdict = (typeof AI_VERDICT)[keyof typeof AI_VERDICT];

export interface ModerationResult {
  verdict: ModerationVerdict;
  maskedText: string;
  categories: string[];
  reason: string;
  detectedLang: string;
}

interface ModerateTextParams {
  text: string;
  targetType: ModerationTargetType;
  targetId?: string | null;
  userId: string;
  supabase: SupabaseClient;
}

interface ClaudeModerationResponse {
  verdict: "PASS" | "WARN" | "BLOCK";
  categories: string[];
  reason: string;
  detectedLang: string;
}

function buildModerationPrompt(maskedText: string): { system: string; prompt: string } {
  const system = [
    "너는 대학 캠퍼스 심부름 매칭 서비스 '캠퍼스런'의 콘텐츠 검열 도우미야.",
    "아래 텍스트를 보고 서비스에 올려도 되는지 판단해. 전화번호·계좌번호 등 개인정보는 이미 ***로 마스킹되어 있어.",
    "판단 기준: 욕설/비하, 성적 불쾌감, 학업 부정행위(대리출석·대리시험·과제 대행) 요청, 불법/위험 물품 거래, 외부 결제 유도, 사기 의심은 BLOCK.",
    "애매하지만 주의가 필요하면 WARN. 문제가 없으면 PASS.",
    "다른 설명 없이 JSON 객체 하나만 출력해.",
    'JSON 스키마: {"verdict": "PASS"|"WARN"|"BLOCK", "categories": string[], "reason": string(한국어 한 문장), "detectedLang": string(예: "ko", "en")}',
  ].join("\n");

  const prompt = `검열할 텍스트:\n${maskedText}`;

  return { system, prompt };
}

/**
 * 1차 규칙(금칙어·학업부정행위 키워드) → 개인정보 마스킹 → 2차 Claude 판정 순으로 검열한다.
 * 1차에서 이미 명백히 걸리면 Claude를 호출하지 않는다(비용·지연 절약, "채팅은 1차 통과분만 AI로").
 * 2차 Claude가 실패/시간 초과하면 PASS로 열어 두고(1차는 이미 통과했으므로) 그 사실을 reason에 남긴다.
 */
export async function moderateText(params: ModerateTextParams): Promise<ModerationResult> {
  const { text, targetType, targetId, userId, supabase } = params;

  const { maskedText, foundTypes } = maskPersonalInfo(text);

  let result: ModerationResult;

  if (containsBannedWord(text)) {
    result = {
      verdict: AI_VERDICT.BLOCK,
      maskedText,
      categories: ["profanity"],
      reason: "금칙어가 포함되어 있어요.",
      detectedLang: "ko",
    };
  } else if (containsAcademicDishonestyKeyword(text)) {
    result = {
      verdict: AI_VERDICT.BLOCK,
      maskedText,
      categories: ["academic_dishonesty"],
      reason: "학업 부정행위와 관련된 요청으로 보여요.",
      detectedLang: "ko",
    };
  } else {
    result = await runClaudeModeration(maskedText, foundTypes);
  }

  await logModeration({ supabase, userId, targetType, targetId, text, result });

  return result;
}

async function runClaudeModeration(maskedText: string, foundTypes: string[]): Promise<ModerationResult> {
  try {
    const { system, prompt } = buildModerationPrompt(maskedText);
    const aiResult = await callClaudeJson<ClaudeModerationResponse>({ system, prompt, maxTokens: 256 });

    const categories = [...(aiResult.categories ?? [])];
    if (foundTypes.length > 0) categories.push("personal_info_masked");

    return {
      verdict: aiResult.verdict in AI_VERDICT ? AI_VERDICT[aiResult.verdict] : AI_VERDICT.PASS,
      maskedText,
      categories,
      reason: aiResult.reason || "AI 판정 결과 문제가 없어요.",
      detectedLang: aiResult.detectedLang || "ko",
    };
  } catch {
    return {
      verdict: AI_VERDICT.PASS,
      maskedText,
      categories: foundTypes.length > 0 ? ["personal_info_masked"] : [],
      reason: "AI 검열 연결 실패로 1차 규칙 결과만 적용했어요.",
      detectedLang: "ko",
    };
  }
}

async function logModeration({
  supabase,
  userId,
  targetType,
  targetId,
  text,
  result,
}: {
  supabase: SupabaseClient;
  userId: string;
  targetType: ModerationTargetType;
  targetId?: string | null;
  text: string;
  result: ModerationResult;
}): Promise<void> {
  await supabase.from("ai_moderations").insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId ?? null,
    detected_lang: result.detectedLang,
    verdict: result.verdict,
    categories: result.categories,
    reason: result.reason,
    original_text: text,
  });
}
