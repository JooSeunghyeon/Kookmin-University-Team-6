import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";
import { containsBannedWord } from "@/lib/moderation/basic-filter";

const nicknameSchema = z.object({
  nickname: z.string().min(2, "닉네임을 2자 이상 입력해 주세요.").max(20),
});

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = nicknameSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  if (containsBannedWord(input.nickname)) {
    return NextResponse.json({ error: "사용할 수 없는 닉네임이에요." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_change_nickname", {
    p_user_id: user.id,
    p_new_nickname: input.nickname,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "닉네임 변경에 실패했어요.");
  }

  return NextResponse.json({ user: data });
}
