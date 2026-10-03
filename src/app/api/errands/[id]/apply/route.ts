import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { applySchema } from "@/lib/validation/errand";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";
import { moderateText } from "@/lib/ai/moderate";
import { AI_VERDICT } from "@/lib/constants";

export async function POST(request: Request, { params }: RouteContext<"/api/errands/[id]/apply">) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = applySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  let maskedMessage = input.message ?? "";
  if (input.message) {
    const moderation = await moderateText({
      text: input.message,
      targetType: "application",
      userId: user.id,
      supabase,
    });
    if (moderation.verdict === AI_VERDICT.BLOCK) {
      return NextResponse.json({ error: moderation.reason || "부적절한 표현이 포함되어 있어요." }, { status: 400 });
    }
    maskedMessage = moderation.maskedText;
  }

  const { data, error } = await supabase.rpc("fn_apply", {
    p_errand_id: id,
    p_applicant_id: user.id,
    p_message: maskedMessage,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "지원에 실패했어요.");
  }

  return NextResponse.json({ application: data });
}
