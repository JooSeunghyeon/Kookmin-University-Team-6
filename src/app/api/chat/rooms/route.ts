import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { openChatRoomSchema } from "@/lib/validation/chat";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";

/**
 * 채팅방을 열거나 기존 방을 돌려준다.
 * - 지원자/수행자가 호출하면 fn_get_or_create_chat_room이 자신을 partner로 하는 방을 찾거나 만든다.
 * - 의뢰자가 partnerId 없이 호출하면 이미 매칭되어 만들어진 방을 조회한다(fn_select_runner가
 *   선택 시점에 방을 만들어 둔다).
 * - 의뢰자가 partnerId(지원자 id)와 함께 호출하면 fn_open_chat_with_applicant로 선택 전에도
 *   해당 지원자와의 방을 새로 열 수 있다.
 */
export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = openChatRoomSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  const { data: errand } = await supabase
    .from("errands")
    .select("id, requester_id")
    .eq("id", input.errandId)
    .single();

  if (!errand) {
    return NextResponse.json({ error: "의뢰를 찾을 수 없어요." }, { status: 404 });
  }

  if (errand.requester_id === user.id) {
    if (input.partnerId) {
      const { data: roomId, error } = await supabase.rpc("fn_open_chat_with_applicant", {
        p_errand_id: input.errandId,
        p_requester_id: user.id,
        p_applicant_id: input.partnerId,
      });

      if (error || !roomId) {
        return rpcErrorResponse(error, "채팅방을 열 수 없어요.");
      }

      return NextResponse.json({ roomId });
    }

    const { data: room } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("errand_id", input.errandId)
      .eq("requester_id", user.id)
      .maybeSingle();

    if (!room) {
      return NextResponse.json({ error: "아직 매칭된 수행자가 없어요." }, { status: 409 });
    }

    return NextResponse.json({ roomId: room.id });
  }

  const { data: roomId, error } = await supabase.rpc("fn_get_or_create_chat_room", {
    p_errand_id: input.errandId,
    p_actor_id: user.id,
  });

  if (error || !roomId) {
    return rpcErrorResponse(error, "채팅방을 열 수 없어요.");
  }

  return NextResponse.json({ roomId });
}
