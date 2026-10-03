import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const { data, error } = await supabase.rpc("fn_join_gathering", {
    p_gathering_id: id,
    p_user_id: user.id,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "참여에 실패했어요.");
  }

  return NextResponse.json({ member: data });
}
