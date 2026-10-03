import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { aiAssistSchema } from "@/lib/validation/errand";
import { requireApiUser } from "@/lib/api/require-user";
import { unauthorizedResponse } from "@/lib/api/errors";
import { requestAiAssist } from "@/lib/ai/assist";
import type { CampusPlace } from "@/lib/supabase/types";

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = aiAssistSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  // campus_places는 RLS가 school_id = auth_school_id()로 이미 걸러 주므로 별도 조건이 필요 없다.
  const { data: places } = await supabase
    .from("campus_places")
    .select("*")
    .eq("is_active", true)
    .returns<CampusPlace[]>();

  const result = await requestAiAssist({
    rawInput: input.rawInput,
    places: places ?? [],
    nowIso: new Date().toISOString(),
  });

  await supabase.from("ai_assists").insert({
    user_id: user.id,
    errand_id: null,
    raw_input: input.rawInput,
    result,
    accepted: false,
  });

  return NextResponse.json({ result });
}
