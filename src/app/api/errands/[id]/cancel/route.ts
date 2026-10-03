import { NextResponse } from "next/server";
import { cancelErrandSchema } from "@/lib/validation/errand";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";

export async function POST(request: Request, { params }: RouteContext<"/api/errands/[id]/cancel">) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const input = cancelErrandSchema.parse(body);

  const { data, error } = await supabase.rpc("fn_cancel_errand", {
    p_errand_id: id,
    p_actor_id: user.id,
    p_reason: input.reason ?? null,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "취소에 실패했어요.");
  }

  return NextResponse.json({ errand: data });
}
