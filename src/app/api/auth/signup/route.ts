import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { signupSchema } from "@/lib/validation/signup";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptField, hashStudentNo } from "@/lib/crypto";
import { containsBannedWord } from "@/lib/moderation/basic-filter";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isDuplicateEmailError(message: string | undefined): boolean {
  if (!message) return false;
  return message.toLowerCase().includes("already") || message.toLowerCase().includes("registered");
}

export async function POST(request: Request) {
  let input;
  try {
    const body = await request.json();
    input = signupSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.issues[0]?.message ?? "입력값을 확인해 주세요.", 400);
    }
    return errorResponse("요청을 처리할 수 없어요.", 400);
  }

  if (containsBannedWord(input.nickname)) {
    return errorResponse("사용할 수 없는 닉네임이에요. 다른 닉네임을 입력해 주세요.", 400);
  }

  const admin = createAdminClient();

  const { data: school, error: schoolError } = await admin
    .from("schools")
    .select("id, email_domain, is_active")
    .eq("id", input.schoolId)
    .single();

  if (schoolError || !school || !school.is_active) {
    return errorResponse("학교 정보를 확인할 수 없어요.", 400);
  }

  const email = `${input.emailLocalPart}@${school.email_domain}`.toLowerCase();

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (createUserError || !createdUser?.user) {
    const duplicate = isDuplicateEmailError(createUserError?.message);
    return errorResponse(
      duplicate ? "이미 가입된 학교 이메일이에요." : "회원가입에 실패했어요. 다시 시도해 주세요.",
      duplicate ? 409 : 500,
    );
  }

  const userId = createdUser.user.id;
  const realNameEnc = encryptField(input.realName);
  const studentNoEnc = encryptField(input.studentNo);
  const studentNoHash = hashStudentNo(input.schoolId, input.studentNo);

  const { error: profileError } = await admin.rpc("fn_signup_profile", {
    p_user_id: userId,
    p_school_id: input.schoolId,
    p_email: email,
    p_real_name_enc: realNameEnc,
    p_student_no_enc: studentNoEnc,
    p_student_no_hash: studentNoHash,
    p_department: input.department ?? null,
    p_nickname: input.nickname,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);

    const message = profileError.message ?? "";
    if (message.includes("student_no_hash")) {
      return errorResponse("이미 가입된 학번이에요.", 409);
    }
    if (message.includes("nickname")) {
      return errorResponse("이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.", 409);
    }
    return errorResponse("회원가입에 실패했어요. 다시 시도해 주세요.", 500);
  }

  return NextResponse.json({ email });
}
