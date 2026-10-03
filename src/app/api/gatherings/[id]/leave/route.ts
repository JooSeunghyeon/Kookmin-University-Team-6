import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const { error } = await supabase.rpc("fn_leave_gathering", {
    p_gathering_id: id,
    p_user_id: user.id,
  });

  if (error) {
    return rpcErrorResponse(error, "탈퇴에 실패했어요.");
  }

  return NextResponse.json({ ok: true });
}
