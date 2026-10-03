import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { addGatheringCommentSchema } from "@/lib/validation/gathering";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";
import { moderateText } from "@/lib/ai/moderate";
import { AI_VERDICT } from "@/lib/constants";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  let input;
  try {
    input = addGatheringCommentSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  const moderation = await moderateText({
    text: input.content,
    targetType: "gathering_comment",
    userId: user.id,
    supabase,
  });

  if (moderation.verdict === AI_VERDICT.BLOCK) {
    return NextResponse.json({ error: moderation.reason || "부적절한 내용이 포함되어 있어요." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_add_gathering_comment", {
    p_gathering_id: id,
    p_author_id: user.id,
    p_content: moderation.maskedText,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "댓글 등록에 실패했어요.");
  }

  return NextResponse.json({ comment: data });
}
