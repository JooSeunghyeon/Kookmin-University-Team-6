import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { reviewSchema } from "@/lib/validation/errand";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";
import { moderateText } from "@/lib/ai/moderate";
import { AI_VERDICT } from "@/lib/constants";

export async function POST(request: Request, { params }: RouteContext<"/api/errands/[id]/review">) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = reviewSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  let maskedComment = input.comment ?? null;
  if (input.comment) {
    const moderation = await moderateText({
      text: input.comment,
      targetType: "review",
      userId: user.id,
      supabase,
    });
    if (moderation.verdict === AI_VERDICT.BLOCK) {
      return NextResponse.json({ error: moderation.reason || "부적절한 표현이 포함되어 있어요." }, { status: 400 });
    }
    maskedComment = moderation.maskedText;
  }

  const { data, error } = await supabase.rpc("fn_write_review", {
    p_errand_id: id,
    p_reviewer_id: user.id,
    p_rating: input.rating,
    p_tags: input.tags ?? [],
    p_comment: maskedComment,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "후기 작성에 실패했어요.");
  }

  return NextResponse.json({ review: data });
}
