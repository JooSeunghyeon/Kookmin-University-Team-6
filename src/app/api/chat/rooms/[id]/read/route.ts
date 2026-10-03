import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";

export async function POST(_request: Request, { params }: RouteContext<"/api/chat/rooms/[id]/read">) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  const { error } = await supabase.rpc("fn_mark_room_read", {
    p_room_id: id,
    p_actor_id: user.id,
  });

  if (error) {
    return rpcErrorResponse(error, "읽음 처리에 실패했어요.");
  }

  return NextResponse.json({ ok: true });
}
