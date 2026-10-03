import { z } from "zod";

export const signupSchema = z.object({
  schoolId: z.string().uuid("학교를 선택해 주세요."),
  emailLocalPart: z
    .string()
    .trim()
    .min(1, "학교 이메일 아이디를 입력해 주세요.")
    .max(64, "이메일 아이디가 너무 길어요.")
    .regex(/^[a-zA-Z0-9._-]+$/, "이메일 아이디 형식이 올바르지 않아요."),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 해요.")
    .max(72, "비밀번호가 너무 길어요."),
  realName: z
    .string()
    .trim()
    .min(2, "실명을 입력해 주세요.")
    .max(30, "이름이 너무 길어요."),
  studentNo: z
    .string()
    .trim()
    .min(4, "학번을 입력해 주세요.")
    .max(20, "학번이 너무 길어요.")
    .regex(/^[0-9A-Za-z-]+$/, "학번 형식이 올바르지 않아요."),
  department: z.string().trim().max(50, "학과명이 너무 길어요.").optional(),
  nickname: z
    .string()
    .trim()
    .min(2, "닉네임은 2자 이상이어야 해요.")
    .max(20, "닉네임은 20자 이하여야 해요."),
});

export type SignupInput = z.infer<typeof signupSchema>;
