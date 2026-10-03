import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createErrandSchema } from "@/lib/validation/errand";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";
import { containsBannedWord } from "@/lib/moderation/basic-filter";

// NOTE: 4단계(ai)에서 moderate()의 2차 Claude 검열을 이 경로에 추가로 연결한다.
// 지금은 1차 규칙 필터만 적용한다.
export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorizedResponse();

  let input;
  try {
    input = createErrandSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  if (containsBannedWord(input.title) || containsBannedWord(input.body)) {
    return NextResponse.json({ error: "부적절한 표현이 포함되어 있어요." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("fn_create_errand", {
    p_requester_id: user.id,
    p_title: input.title,
    p_body: input.body,
    p_raw_input: input.rawInput ?? input.body,
    p_category: input.category,
    p_from_place_id: input.fromPlaceId ?? null,
    p_from_lat: input.fromLat,
    p_from_lng: input.fromLng,
    p_from_label: input.fromLabel,
    p_from_detail: input.fromDetail ?? null,
    p_to_place_id: input.toPlaceId ?? null,
    p_to_lat: input.toLat,
    p_to_lng: input.toLng,
    p_to_label: input.toLabel,
    p_to_detail: input.toDetail ?? null,
    p_desired_at: input.desiredAt,
    p_price: input.price,
    p_ai_suggested_price: input.aiSuggestedPrice ?? null,
    p_urgent_level: input.urgentLevel,
    p_image_url: input.imageUrl ?? null,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "의뢰 등록에 실패했어요.");
  }

  return NextResponse.json({ errand: data });
}
