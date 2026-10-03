/**
 * 데모/시드 스크립트. 학교 2곳, 장소 20개, 계정 7개, 의뢰 12건(국민대 10 + 서울대 2)을
 * DB 함수(fn_*)를 그대로 호출해 생성한 뒤 마감 시각만 과거로 UPDATE하고
 * process_deadlines()를 실행해 장부를 자연스럽게 정합시킨다.
 *
 * 실행: npm run seed  (SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY, DEMO_ACCOUNT_PASSWORD 필요)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocketImpl from "ws";
import { createAdminClient } from "../src/lib/supabase/admin";
import { encryptField, hashStudentNo } from "../src/lib/crypto";
import { generateRandomNickname } from "../src/lib/nickname";
import { SCHOOL_SEED } from "../src/lib/constants";

// supabase-js의 realtime-js는 생성자에서 전역 WebSocket을 즉시 요구한다.
// 배포 환경(Vercel, Node 24.x)에는 네이티브 WebSocket이 있지만 로컬 Node 20
// 환경에는 없으므로 이 스크립트에서만 폴리필한다.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: typeof WebSocketImpl }).WebSocket = WebSocketImpl;
}

type AdminClient = ReturnType<typeof createAdminClient>;

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

interface SeedSchool {
  id: string;
  name: string;
  email_domain: string;
  center_lat: number;
  center_lng: number;
}

async function upsertSchools(admin: AdminClient): Promise<Record<string, SeedSchool>> {
  const bySlug: Record<string, SeedSchool> = {};
  for (const seed of SCHOOL_SEED) {
    const { data, error } = await admin
      .from("schools")
      .upsert(
        {
          name: seed.name,
          email_domain: seed.email_domain,
          center_lat: seed.center_lat,
          center_lng: seed.center_lng,
          is_active: true,
        },
        { onConflict: "email_domain" },
      )
      .select("id, name, email_domain, center_lat, center_lng")
      .single();

    if (error || !data) {
      throw new Error(`학교 생성 실패(${seed.name}): ${error?.message}`);
    }
    bySlug[seed.email_domain] = data;
  }
  return bySlug;
}

interface PlaceSpec {
  name: string;
  category: "building" | "cafeteria" | "store" | "gate" | "dorm" | "etc";
  latOffset: number;
  lngOffset: number;
}

const PLACE_SPECS: PlaceSpec[] = [
  { name: "정문", category: "gate", latOffset: 0.0012, lngOffset: -0.0008 },
  { name: "후문", category: "gate", latOffset: -0.0015, lngOffset: 0.0014 },
  { name: "학생회관 학식당", category: "cafeteria", latOffset: 0.0003, lngOffset: 0.0006 },
  { name: "제2학생회관 식당", category: "cafeteria", latOffset: -0.0004, lngOffset: -0.0003 },
  { name: "중앙도서관", category: "building", latOffset: 0.0006, lngOffset: -0.0012 },
  { name: "공학관", category: "building", latOffset: -0.0009, lngOffset: 0.0009 },
  { name: "경영관", category: "building", latOffset: 0.0011, lngOffset: 0.0003 },
  { name: "기숙사 1동", category: "dorm", latOffset: -0.0018, lngOffset: -0.0011 },
  { name: "편의점(CU)", category: "store", latOffset: 0.0002, lngOffset: 0.0011 },
  { name: "복사실", category: "store", latOffset: -0.0006, lngOffset: 0.0002 },
];

async function reseedPlaces(
  admin: AdminClient,
  school: SeedSchool,
): Promise<Record<string, { id: string; lat: number; lng: number; name: string }>> {
  await admin.from("campus_places").delete().eq("school_id", school.id);

  const rows = PLACE_SPECS.map((spec) => ({
    school_id: school.id,
    name: spec.name,
    category: spec.category,
    lat: school.center_lat + spec.latOffset,
    lng: school.center_lng + spec.lngOffset,
    is_active: true,
  }));

  const { data, error } = await admin.from("campus_places").insert(rows).select("id, name, lat, lng");
  if (error || !data) {
    throw new Error(`장소 생성 실패(${school.name}): ${error?.message}`);
  }

  const byName: Record<string, { id: string; lat: number; lng: number; name: string }> = {};
  for (const place of data) {
    byName[place.name] = place;
  }
  return byName;
}

interface SeedUserSpec {
  email: string;
  schoolDomain: string;
  realName: string;
  studentNo: string;
  department: string;
  nickname: string;
  role: "user" | "admin";
}

const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD ?? "CampusRun2026!";

const USER_SPECS: SeedUserSpec[] = [
  {
    email: "requester@kookmin.ac.kr",
    schoolDomain: "kookmin.ac.kr",
    realName: "김의뢰",
    studentNo: "20201001",
    department: "경영학부",
    nickname: "성실한 너구리 1",
    role: "user",
  },
  {
    email: "runner@kookmin.ac.kr",
    schoolDomain: "kookmin.ac.kr",
    realName: "이수행",
    studentNo: "20201002",
    department: "소프트웨어학부",
    nickname: "재빠른 수달 2",
    role: "user",
  },
  {
    email: "user1@kookmin.ac.kr",
    schoolDomain: "kookmin.ac.kr",
    realName: "박일반",
    studentNo: "20201003",
    department: "기계공학부",
    nickname: "활발한 다람쥐 3",
    role: "user",
  },
  {
    email: "user2@kookmin.ac.kr",
    schoolDomain: "kookmin.ac.kr",
    realName: "최일반",
    studentNo: "20201004",
    department: "건축학부",
    nickname: "조용한 고양이 4",
    role: "user",
  },
  {
    email: "user3@kookmin.ac.kr",
    schoolDomain: "kookmin.ac.kr",
    realName: "정일반",
    studentNo: "20201005",
    department: "디자인학부",
    nickname: "유쾌한 햄스터 5",
    role: "user",
  },
  {
    email: "admin@kookmin.ac.kr",
    schoolDomain: "kookmin.ac.kr",
    realName: "운영진",
    studentNo: "20201006",
    department: "운영팀",
    nickname: "차분한 부엉이 6",
    role: "admin",
  },
  {
    email: "student@snu.ac.kr",
    schoolDomain: "snu.ac.kr",
    realName: "홍서울",
    studentNo: "20201007",
    department: "자유전공학부",
    nickname: "용감한 여우 7",
    role: "user",
  },
];

async function findExistingAuthUserId(admin: AdminClient, email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const match = data?.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

async function ensureUser(
  admin: AdminClient,
  spec: SeedUserSpec,
  schools: Record<string, SeedSchool>,
): Promise<string> {
  const school = schools[spec.schoolDomain];
  if (!school) {
    throw new Error(`알 수 없는 학교 도메인: ${spec.schoolDomain}`);
  }

  let userId = await findExistingAuthUserId(admin, spec.email);

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`계정 생성 실패(${spec.email}): ${error?.message}`);
    }
    userId = data.user.id;
  }

  const { data: existingProfile } = await admin.from("users").select("id").eq("id", userId).maybeSingle();

  if (!existingProfile) {
    const { error: profileError } = await admin.rpc("fn_signup_profile", {
      p_user_id: userId,
      p_school_id: school.id,
      p_email: spec.email,
      p_real_name_enc: encryptField(spec.realName),
      p_student_no_enc: encryptField(spec.studentNo),
      p_student_no_hash: hashStudentNo(school.id, spec.studentNo),
      p_department: spec.department,
      p_nickname: spec.nickname || generateRandomNickname(),
    });
    if (profileError) {
      throw new Error(`프로필 생성 실패(${spec.email}): ${profileError.message}`);
    }
  }

  if (spec.role === "admin") {
    await admin.from("users").update({ role: "admin" }).eq("id", userId);
  }

  return userId;
}

async function topUpBalance(admin: AdminClient, userId: string, amount: number): Promise<void> {
  const { error } = await admin.rpc("_add_points", {
    p_user_id: userId,
    p_delta: amount,
    p_type: "CHARGE",
    p_errand_id: null,
  });
  if (error) {
    throw new Error(`포인트 충전 실패: ${error.message}`);
  }
}

interface CreateErrandArgs {
  schoolId: string;
  requesterId: string;
  title: string;
  body: string;
  category: string;
  fromPlace: { id: string; lat: number; lng: number; name: string };
  toPlace: { id: string; lat: number; lng: number; name: string };
  price: number;
  urgentLevel?: 0 | 1 | 2;
}

async function createErrand(admin: AdminClient, args: CreateErrandArgs): Promise<string> {
  const { data, error } = await admin.rpc("fn_create_errand", {
    p_requester_id: args.requesterId,
    p_title: args.title,
    p_body: args.body,
    p_raw_input: args.body,
    p_category: args.category,
    p_from_place_id: args.fromPlace.id,
    p_from_lat: args.fromPlace.lat,
    p_from_lng: args.fromPlace.lng,
    p_from_label: args.fromPlace.name,
    p_from_detail: null,
    p_to_place_id: args.toPlace.id,
    p_to_lat: args.toPlace.lat,
    p_to_lng: args.toPlace.lng,
    p_to_label: args.toPlace.name,
    p_to_detail: null,
    p_desired_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    p_price: args.price,
    p_ai_suggested_price: args.price,
    p_urgent_level: args.urgentLevel ?? 0,
    p_image_url: null,
  });
  if (error || !data) {
    throw new Error(`의뢰 생성 실패(${args.title}): ${error?.message}`);
  }
  return data.id as string;
}

async function applyToErrand(admin: AdminClient, errandId: string, applicantId: string): Promise<string> {
  const { data, error } = await admin.rpc("fn_apply", {
    p_errand_id: errandId,
    p_applicant_id: applicantId,
    p_message: "제가 도와드릴게요!",
  });
  if (error || !data) {
    throw new Error(`지원 실패: ${error?.message}`);
  }
  return data.id as string;
}

async function selectRunner(
  admin: AdminClient,
  errandId: string,
  applicationId: string,
  requesterId: string,
): Promise<void> {
  const { error } = await admin.rpc("fn_select_runner", {
    p_errand_id: errandId,
    p_application_id: applicationId,
    p_actor_id: requesterId,
  });
  if (error) {
    throw new Error(`수행자 선택 실패: ${error.message}`);
  }
}

async function reportCompletion(admin: AdminClient, errandId: string, runnerId: string): Promise<void> {
  const { error } = await admin.rpc("fn_report_completion", {
    p_errand_id: errandId,
    p_runner_id: runnerId,
    p_photo_url: null,
    p_memo: "완료했습니다!",
  });
  if (error) {
    throw new Error(`완료 보고 실패: ${error.message}`);
  }
}

async function confirmCompletion(admin: AdminClient, errandId: string, requesterId: string): Promise<void> {
  const { error } = await admin.rpc("fn_confirm_completion", {
    p_errand_id: errandId,
    p_actor_id: requesterId,
  });
  if (error) {
    throw new Error(`완료 확인 실패: ${error.message}`);
  }
}

async function writeReview(admin: AdminClient, errandId: string, reviewerId: string): Promise<void> {
  const { error } = await admin.rpc("fn_write_review", {
    p_errand_id: errandId,
    p_reviewer_id: reviewerId,
    p_rating: 5,
    p_tags: ["시간 약속을 잘 지켜요", "친절해요"],
    p_comment: "정말 꼼꼼하게 잘해주셨어요!",
  });
  if (error) {
    throw new Error(`후기 작성 실패: ${error.message}`);
  }
}

async function createReport(
  admin: AdminClient,
  schoolId: string,
  reporterId: string,
  errandId: string,
  targetUserId: string,
): Promise<void> {
  const { error } = await admin.rpc("fn_create_report", {
    p_school_id: schoolId,
    p_reporter_id: reporterId,
    p_target_type: "errand",
    p_target_id: errandId,
    p_target_user_id: targetUserId,
    p_reason: "SCAM",
    p_detail: "쪽지로 외부 거래를 유도하는 것 같아요.",
    p_ai_category: null,
    p_ai_severity: null,
  });
  if (error) {
    throw new Error(`신고 실패: ${error.message}`);
  }
}

async function countSeededErrands(admin: AdminClient, schoolId: string): Promise<number> {
  const { count } = await admin
    .from("errands")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .like("title", "[데모]%");
  return count ?? 0;
}

async function seedErrands(
  admin: AdminClient,
  kookmin: SeedSchool,
  snu: SeedSchool,
  kookminPlaces: Record<string, { id: string; lat: number; lng: number; name: string }>,
  snuPlaces: Record<string, { id: string; lat: number; lng: number; name: string }>,
  userIds: Record<string, string>,
): Promise<void> {
  const already = await countSeededErrands(admin, kookmin.id);
  if (already >= 10) {
    console.log(`이미 의뢰 ${already}건이 시드되어 있어 건너뜁니다.`);
    return;
  }

  const requesterId = userIds["requester@kookmin.ac.kr"];
  const runnerId = userIds["runner@kookmin.ac.kr"];
  const user1Id = userIds["user1@kookmin.ac.kr"];
  const user2Id = userIds["user2@kookmin.ac.kr"];
  const snuStudentId = userIds["student@snu.ac.kr"];

  const gate = kookminPlaces["정문"];
  const cafeteria = kookminPlaces["학생회관 학식당"];
  const library = kookminPlaces["중앙도서관"];
  const dorm = kookminPlaces["기숙사 1동"];
  const store = kookminPlaces["편의점(CU)"];
  const copyShop = kookminPlaces["복사실"];

  await topUpBalance(admin, requesterId, 30_000);

  // 1. RECRUITING(일반)
  await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 학생회관 학식 포장해주실 분",
    body: "학생회관 학식 포장 부탁드려요. 가격은 포장비 포함이에요.",
    category: "meal",
    fromPlace: cafeteria,
    toPlace: library,
    price: 3000,
  });

  // 2. RECRUITING + 긴급
  await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 급해요! 과제 출력 부탁드려요",
    body: "30분 안에 과제를 출력해서 가져다주실 분 구해요.",
    category: "print",
    fromPlace: copyShop,
    toPlace: library,
    price: 2000,
    urgentLevel: 1,
  });

  // 3. RECRUITING + 긴급 플러스
  await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 기숙사 택배 좀 받아주세요 (매우 급함)",
    body: "곧 수업이라 택배를 못 받아요. 대신 수령해 주세요.",
    category: "parcel",
    fromPlace: gate,
    toPlace: dorm,
    price: 3000,
    urgentLevel: 2,
  });

  // 4. SELECTING (지원 마감, 선택 대기) — 지원자 2명, recruit_deadline을 나중에 과거로 UPDATE
  const selectingErrandId = await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 편의점 간식 픽업 부탁드려요",
    body: "편의점에서 간식 사서 가져다주실 분 구해요.",
    category: "pickup",
    fromPlace: store,
    toPlace: library,
    price: 2500,
  });
  await applyToErrand(admin, selectingErrandId, runnerId);
  await applyToErrand(admin, selectingErrandId, user1Id);

  // 5. EXPIRED(만료·환불) — 지원자 0명인 채 recruit_deadline을 과거로 UPDATE
  const expiredErrandId = await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 잠깐 자리 맡아주실 분 구해요",
    body: "도서관 자리 잠깐 맡아주실 분이요.",
    category: "etc",
    fromPlace: library,
    toPlace: library,
    price: 1500,
  });

  // 6. MATCHED(진행 중)
  const matchedErrandId = await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 짐 옮기는 거 도와주세요",
    body: "기숙사에서 학과 사무실까지 짐 옮기는 거 도와주세요.",
    category: "moving",
    fromPlace: dorm,
    toPlace: library,
    price: 3000,
  });
  const matchedApplicationId = await applyToErrand(admin, matchedErrandId, runnerId);
  await selectRunner(admin, matchedErrandId, matchedApplicationId, requesterId);

  // 7. CONFIRMING(완료 확인 대기)
  const confirmingErrandId = await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 도서관 앞 카페 음료 픽업",
    body: "카페 음료 픽업해서 도서관으로 가져다주세요.",
    category: "meal",
    fromPlace: gate,
    toPlace: library,
    price: 2500,
  });
  const confirmingApplicationId = await applyToErrand(admin, confirmingErrandId, runnerId);
  await selectRunner(admin, confirmingErrandId, confirmingApplicationId, requesterId);
  await reportCompletion(admin, confirmingErrandId, runnerId);

  // 8. COMPLETED(24h 자동 확인) — confirm_deadline을 나중에 과거로 UPDATE
  const autoCompletedErrandId = await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 레포트 제본 맡아주실 분",
    body: "복사실에서 레포트 제본해서 가져다주세요.",
    category: "print",
    fromPlace: copyShop,
    toPlace: library,
    price: 1500,
  });
  const autoApplicationId = await applyToErrand(admin, autoCompletedErrandId, runnerId);
  await selectRunner(admin, autoCompletedErrandId, autoApplicationId, requesterId);
  await reportCompletion(admin, autoCompletedErrandId, runnerId);

  // 9. COMPLETED(후기까지 완료)
  const reviewedErrandId = await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 우체국 택배 보내주실 분",
    body: "우체국에서 택배 보내주실 분 구해요.",
    category: "parcel",
    fromPlace: gate,
    toPlace: store,
    price: 2000,
  });
  const reviewedApplicationId = await applyToErrand(admin, reviewedErrandId, runnerId);
  await selectRunner(admin, reviewedErrandId, reviewedApplicationId, requesterId);
  await reportCompletion(admin, reviewedErrandId, runnerId);
  await confirmCompletion(admin, reviewedErrandId, requesterId);
  await writeReview(admin, reviewedErrandId, requesterId);

  // 10. 블라인드(서로 다른 신고자 3명)
  const blindedErrandId = await createErrand(admin, {
    schoolId: kookmin.id,
    requesterId,
    title: "[데모] 잠깐 거래할 거 있어요 (쪽지 주세요)",
    body: "자세한 건 쪽지로 따로 드릴게요.",
    category: "etc",
    fromPlace: gate,
    toPlace: gate,
    price: 2000,
  });
  await createReport(admin, kookmin.id, runnerId, blindedErrandId, requesterId);
  await createReport(admin, kookmin.id, user1Id, blindedErrandId, requesterId);
  await createReport(admin, kookmin.id, user2Id, blindedErrandId, requesterId);

  // 서울대 모집 중 2건 (학교 격리 확인용)
  const snuGate = snuPlaces["정문"];
  const snuCafeteria = snuPlaces["학생회관 학식당"];
  const snuLibrary = snuPlaces["중앙도서관"];
  const snuCopyShop = snuPlaces["복사실"];

  await createErrand(admin, {
    schoolId: snu.id,
    requesterId: snuStudentId,
    title: "[데모] 서울대 학생회관 학식 포장 부탁드려요",
    body: "학생회관 학식 포장해서 가져다주세요.",
    category: "meal",
    fromPlace: snuCafeteria,
    toPlace: snuLibrary,
    price: 3000,
  });

  await createErrand(admin, {
    schoolId: snu.id,
    requesterId: snuStudentId,
    title: "[데모] 중앙도서관 프린트 대신 해주세요",
    body: "프린트해서 중앙도서관으로 가져다주세요.",
    category: "print",
    fromPlace: snuCopyShop,
    toPlace: snuGate,
    price: 2000,
  });

  // 마감 시각을 과거로 UPDATE한 뒤 process_deadlines()로 한 번에 정합시킨다.
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

  await admin
    .from("errands")
    .update({ recruit_deadline_at: tenMinutesAgo })
    .in("id", [selectingErrandId, expiredErrandId]);

  await admin
    .from("errands")
    .update({ confirm_deadline_at: oneMinuteAgo })
    .eq("id", autoCompletedErrandId);

  const { error: deadlineError } = await admin.rpc("process_deadlines");
  if (deadlineError) {
    throw new Error(`process_deadlines 실행 실패: ${deadlineError.message}`);
  }

  console.log("의뢰 12건(국민대 10 + 서울대 2) 시드 완료, process_deadlines() 적용 완료.");
}

async function main(): Promise<void> {
  loadEnvLocal();

  const admin = createAdminClient();

  console.log("학교 생성 중...");
  const schools = await upsertSchools(admin);
  const kookmin = schools["kookmin.ac.kr"];
  const snu = schools["snu.ac.kr"];

  console.log("장소 생성 중...");
  const kookminPlaces = await reseedPlaces(admin, kookmin);
  const snuPlaces = await reseedPlaces(admin, snu);

  console.log("계정 생성 중...");
  const userIds: Record<string, string> = {};
  for (const spec of USER_SPECS) {
    userIds[spec.email] = await ensureUser(admin, spec, schools);
  }

  console.log("의뢰 생성 중...");
  await seedErrands(admin, kookmin, snu, kookminPlaces, snuPlaces, userIds);

  console.log("\n=== 시드 완료 ===");
  console.log(`비밀번호(전체 공통): ${DEMO_PASSWORD}`);
  for (const spec of USER_SPECS) {
    console.log(`- ${spec.email} (${spec.nickname}, role=${spec.role})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
