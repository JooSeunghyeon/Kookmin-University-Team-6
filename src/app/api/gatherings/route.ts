import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createGatheringSchema } from "@/lib/validation/gathering";
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
    input = createGatheringSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "요청을 처리할 수 없어요." }, { status: 400 });
  }

  const moderation = await moderateText({
    text: `${input.title}${MODERATION_DELIMITER}${input.description}`,
    targetType: "gathering",
    userId: user.id,
    supabase,
  });

  if (moderation.verdict === AI_VERDICT.BLOCK) {
    return NextResponse.json({ error: moderation.reason || "부적절한 내용이 포함되어 있어요." }, { status: 400 });
  }

  const [maskedTitle, maskedDescription] = moderation.maskedText.split(MODERATION_DELIMITER);

  const { data, error } = await supabase.rpc("fn_create_gathering", {
    p_host_id: user.id,
    p_title: maskedTitle ?? input.title,
    p_description: maskedDescription ?? input.description,
    p_category: input.category,
    p_capacity: input.capacity,
    p_meet_at: input.meetAt,
    p_place_label: input.placeLabel,
    p_place_lat: input.placeLat ?? null,
    p_place_lng: input.placeLng ?? null,
  });

  if (error || !data) {
    return rpcErrorResponse(error, "모임 등록에 실패했어요.");
  }

  return NextResponse.json({ gathering: data });
}
