import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { urgentUpgradeSchema } from "@/lib/validation/errand";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";

export async function POST(request: Request, { params }: RouteContext<"/api/errands/[id]/urgent">) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = urgentUpgradeSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_upgrade_urgent", {
    p_errand_id: id,
    p_actor_id: user.id,
    p_level: input.level,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "긴급 옵션 적용에 실패했어요.");
  }

  return NextResponse.json({ errand: data });
}
