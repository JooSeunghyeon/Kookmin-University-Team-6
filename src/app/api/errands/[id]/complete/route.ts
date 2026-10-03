import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { completeSchema } from "@/lib/validation/errand";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";

export async function POST(request: Request, { params }: RouteContext<"/api/errands/[id]/complete">) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = completeSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_report_completion", {
    p_errand_id: id,
    p_runner_id: user.id,
    p_photo_url: input.photoUrl ?? null,
    p_memo: input.memo ?? null,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "완료 보고에 실패했어요.");
  }

  return NextResponse.json({ errand: data });
}
