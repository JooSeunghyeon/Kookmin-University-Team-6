import { z } from "zod";
import { ERRAND_CATEGORIES, LOCATION_TYPES } from "@/lib/constants";

const CATEGORY_VALUES = ERRAND_CATEGORIES.map((category) => category.value) as [string, ...string[]];

export const createErrandSchema = z.object({
  title: z.string().min(2, "제목을 2자 이상 입력해 주세요.").max(60),
  body: z.string().min(5, "내용을 5자 이상 입력해 주세요.").max(1000),
  rawInput: z.string().max(1000).optional(),
  category: z.enum(CATEGORY_VALUES),
  locationType: z.enum(LOCATION_TYPES).default("campus"),
  fromPlaceId: z.string().uuid().nullable().optional(),
  fromLat: z.number().nullable().optional(),
  fromLng: z.number().nullable().optional(),
  fromLabel: z.string().min(1, "출발지를 선택해 주세요."),
  fromDetail: z.string().max(200).optional(),
  toPlaceId: z.string().uuid().nullable().optional(),
  toLat: z.number().nullable().optional(),
  toLng: z.number().nullable().optional(),
  toLabel: z.string().min(1, "도착지를 선택해 주세요."),
  toDetail: z.string().max(200).optional(),
  desiredAt: z.string().min(1, "희망 시각을 선택해 주세요."),
  price: z.number().int().min(1000, "금액은 1,000P 이상이어야 해요."),
  aiSuggestedPrice: z.number().int().optional(),
  urgentLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  imageUrl: z.string().url().optional(),
}).refine(
  (input) =>
    input.locationType !== "campus" ||
    (input.fromLat !== null && input.fromLat !== undefined && input.fromLng !== null && input.fromLng !== undefined &&
      input.toLat !== null && input.toLat !== undefined && input.toLng !== null && input.toLng !== undefined),
  { message: "캠퍼스 장소를 선택하면 좌표가 필요해요." },
);

export type CreateErrandInput = z.infer<typeof createErrandSchema>;

export const applySchema = z.object({
  message: z.string().max(300).optional(),
});

export const selectRunnerSchema = z.object({
  applicationId: z.string().uuid(),
});

export const completeSchema = z.object({
  photoUrl: z.string().url().optional(),
  memo: z.string().max(300).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string()).max(5).optional(),
  comment: z.string().max(300).optional(),
});

export const urgentUpgradeSchema = z.object({
  level: z.union([z.literal(1), z.literal(2)]),
});

export const cancelErrandSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const aiAssistSchema = z.object({
  rawInput: z.string().min(2, "내용을 2자 이상 입력해 주세요.").max(1000),
});
