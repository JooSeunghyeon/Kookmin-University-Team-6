import { z } from "zod";

export const createInquirySchema = z.object({
  content: z.string().min(2, "문의 내용을 2자 이상 입력해 주세요.").max(500),
  isSecret: z.boolean().default(false),
});

export const answerInquirySchema = z.object({
  answer: z.string().min(1, "답변을 입력해 주세요.").max(500),
});
