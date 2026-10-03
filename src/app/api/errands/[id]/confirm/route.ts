import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";

export async function POST(_request: Request, { params }: RouteContext<"/api/errands/[id]/confirm">) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  const { data, error } = await supabase.rpc("fn_confirm_completion", {
    p_errand_id: id,
    p_actor_id: user.id,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "완료 확인에 실패했어요.");
  }

  return NextResponse.json({ errand: data });
}
