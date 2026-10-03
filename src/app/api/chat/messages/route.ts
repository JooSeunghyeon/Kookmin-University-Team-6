import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { sendChatMessageSchema } from "@/lib/validation/chat";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";
import { moderateText } from "@/lib/ai/moderate";
import { AI_VERDICT } from "@/lib/constants";

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = sendChatMessageSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  const moderation = await moderateText({
    text: input.content,
    targetType: "chat_message",
    targetId: input.roomId,
    userId: user.id,
    supabase,
  });
  if (moderation.verdict === AI_VERDICT.BLOCK) {
    return NextResponse.json({ error: moderation.reason || "부적절한 표현이 포함되어 있어요." }, { status: 400 });
  }

  const isMasked = moderation.maskedText !== input.content;

  const { data, error } = await supabase.rpc("fn_send_chat_message", {
    p_room_id: input.roomId,
    p_sender_id: user.id,
    p_content: moderation.maskedText,
    p_is_masked: isMasked,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "메시지를 보낼 수 없어요.");
  }

  return NextResponse.json({ message: data });
}
