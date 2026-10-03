import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, CLAUDE_TIMEOUT_MS } from "@/lib/constants";

let cachedClient: Anthropic | null = null;

function getClaudeClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았어요.");
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

function extractJsonText(rawText: string): string {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return rawText.trim();
  }
  return rawText.slice(firstBrace, lastBrace + 1).trim();
}

interface CallClaudeJsonParams {
  system: string;
  prompt: string;
  maxTokens?: number;
}

/**
 * Claude를 호출해 JSON 응답을 받는다. 8초 안에 응답이 없거나 파싱에 실패하면 던진다.
 * 호출하는 쪽(assist.ts, moderate.ts)이 각자의 규칙 기반 폴백으로 이어 받는다.
 */
export async function callClaudeJson<T>({ system, prompt, maxTokens = 1024 }: CallClaudeJsonParams): Promise<T> {
  const client = getClaudeClient();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const response = await client.messages.create(
      {
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal },
    );

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude 응답에 텍스트가 없어요.");
    }

    const jsonText = extractJsonText(textBlock.text);
    return JSON.parse(jsonText) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
