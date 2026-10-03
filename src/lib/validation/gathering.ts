import { z } from "zod";
import { GATHERING_CATEGORIES, MIN_GATHERING_CAPACITY, MAX_GATHERING_CAPACITY } from "@/lib/constants";

const CATEGORY_VALUES = GATHERING_CATEGORIES.map((category) => category.value) as [string, ...string[]];

export const createGatheringSchema = z.object({
  title: z.string().min(2, "제목을 2자 이상 입력해 주세요.").max(60),
  description: z.string().min(5, "설명을 5자 이상 입력해 주세요.").max(1000),
  category: z.enum(CATEGORY_VALUES),
  capacity: z.number().int().min(MIN_GATHERING_CAPACITY, "정원은 2명 이상이어야 해요.").max(MAX_GATHERING_CAPACITY),
  meetAt: z.string().min(1, "모일 시각을 선택해 주세요."),
  placeLabel: z.string().min(1, "장소를 입력해 주세요.").max(60),
  placeLat: z.number().nullable().optional(),
  placeLng: z.number().nullable().optional(),
});

export type CreateGatheringInput = z.infer<typeof createGatheringSchema>;

export const addGatheringCommentSchema = z.object({
  content: z.string().min(1, "내용을 입력해 주세요.").max(300),
});
