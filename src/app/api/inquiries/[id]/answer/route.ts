import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { answerInquirySchema } from "@/lib/validation/inquiry";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";
import { moderateText } from "@/lib/ai/moderate";
import { AI_VERDICT } from "@/lib/constants";

export async function POST(request: Request, { params }: RouteContext<"/api/inquiries/[id]/answer">) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = answerInquirySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  const moderation = await moderateText({
    text: input.answer,
    targetType: "inquiry",
    targetId: id,
    userId: user.id,
    supabase,
  });
  if (moderation.verdict === AI_VERDICT.BLOCK) {
    return NextResponse.json({ error: moderation.reason || "부적절한 표현이 포함되어 있어요." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_answer_inquiry", {
    p_inquiry_id: id,
    p_actor_id: user.id,
    p_answer: moderation.maskedText,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "답변 등록에 실패했어요.");
  }

  return NextResponse.json({ inquiry: data });
}
