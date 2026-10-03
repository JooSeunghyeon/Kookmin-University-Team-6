import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createErrandSchema } from "@/lib/validation/errand";
import { requireApiUser } from "@/lib/api/require-user";
import { rpcErrorResponse, unauthorizedResponse } from "@/lib/api/errors";
import { moderateText } from "@/lib/ai/moderate";
import { AI_VERDICT } from "@/lib/constants";

const MODERATION_DELIMITER = "\n---BODY---\n";

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

  // 제목·본문을 한 번에 검열해 Claude 호출을 1회로 줄인다(직렬 8초 타임아웃 2회가 쌓이면
  // 서버리스 함수 전체 제한 시간을 넘길 수 있다). 구분자로 합쳤다가 결과를 다시 나눈다.
  const moderation = await moderateText({
    text: `${input.title}${MODERATION_DELIMITER}${input.body}`,
    targetType: "errand",
    userId: user.id,
    supabase,
  });

  if (moderation.verdict === AI_VERDICT.BLOCK) {
    return NextResponse.json({ error: moderation.reason || "부적절한 내용이 포함되어 있어요." }, { status: 400 });
  }

  const [maskedTitle, maskedBody] = moderation.maskedText.split(MODERATION_DELIMITER);

  const { data, error } = await supabase.rpc("fn_create_errand", {
    p_requester_id: user.id,
    p_title: maskedTitle ?? input.title,
    p_body: maskedBody ?? input.body,
    p_raw_input: input.rawInput ?? input.body,
    p_category: input.category,
    p_from_place_id: input.fromPlaceId ?? null,
    p_from_lat: input.fromLat ?? null,
    p_from_lng: input.fromLng ?? null,
    p_from_label: input.fromLabel,
    p_from_detail: input.fromDetail ?? null,
    p_to_place_id: input.toPlaceId ?? null,
    p_to_lat: input.toLat ?? null,
    p_to_lng: input.toLng ?? null,
    p_to_label: input.toLabel,
    p_to_detail: input.toDetail ?? null,
    p_desired_at: input.desiredAt,
    p_price: input.price,
    p_ai_suggested_price: input.aiSuggestedPrice ?? null,
    p_urgent_level: input.urgentLevel,
    p_image_url: input.imageUrl ?? null,
    p_location_type: input.locationType,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "의뢰 등록에 실패했어요.");
  }

  return NextResponse.json({ errand: data });
}
