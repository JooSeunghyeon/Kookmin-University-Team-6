/**
 * 시연용 데이터 초기화 스크립트.
 * 기존 회원·의뢰·모임 데이터를 모두 지우고, 바로 시연할 수 있는 상태로 다시 만든다.
 * 모든 생성은 DB 함수(fn_*)를 그대로 호출해 장부(에스크로·포인트)가 어긋나지 않게 한다.
 *
 * 실행: npm run demo:reset
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocketImpl from "ws";
import { createAdminClient } from "../src/lib/supabase/admin";
import { encryptField, hashStudentNo } from "../src/lib/crypto";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: typeof WebSocketImpl }).WebSocket = WebSocketImpl;
}

type AdminClient = ReturnType<typeof createAdminClient>;

const SCHOOL = {
  name: "국민대학교",
  emailDomain: "kookmin.ac.kr",
  centerLat: 37.6108,
  centerLng: 126.9975,
} as const;

const DEMO_PASSWORD = "Campus1234!";

/** 시연 때 직접 로그인해 쓸 계정. */
const TEST_ACCOUNT = {
  email: "test@kookmin.ac.kr",
  realName: "김테스트",
  studentNo: "20240001",
  department: "소프트웨어학부",
  nickname: "성실한 라쿤",
  startingPoints: 50_000,
} as const;

interface MemberSpec {
  email: string;
  realName: string;
  studentNo: string;
  department: string;
  nickname: string;
  points: number;
}

/** 피드가 비어 보이지 않도록 함께 만드는 다른 학생들. */
const MEMBERS: MemberSpec[] = [
  { email: "minji@kookmin.ac.kr", realName: "이민지", studentNo: "20240002", department: "경영학부", nickname: "느긋한 판다", points: 30_000 },
  { email: "jiho@kookmin.ac.kr", realName: "박지호", studentNo: "20240003", department: "기계공학부", nickname: "날쌘 치타", points: 30_000 },
  { email: "seoyeon@kookmin.ac.kr", realName: "최서연", studentNo: "20240004", department: "시각디자인학과", nickname: "다정한 알파카", points: 30_000 },
  { email: "dohyun@kookmin.ac.kr", realName: "정도현", studentNo: "20240005", department: "법학부", nickname: "조용한 수달", points: 30_000 },
  { email: "hayeon@kookmin.ac.kr", realName: "강하연", studentNo: "20240006", department: "AI빅데이터융합경영학과", nickname: "발랄한 토끼", points: 30_000 },
];

interface PlaceSpec {
  name: string;
  category: "building" | "cafeteria" | "store" | "gate" | "dorm" | "etc";
  latOffset: number;
  lngOffset: number;
}

const PLACES: PlaceSpec[] = [
  { name: "정문", category: "gate", latOffset: 0.0012, lngOffset: -0.0008 },
  { name: "북문", category: "gate", latOffset: -0.0015, lngOffset: 0.0014 },
  { name: "미래관", category: "building", latOffset: 0.0004, lngOffset: 0.0002 },
  { name: "공학관", category: "building", latOffset: -0.0009, lngOffset: 0.0009 },
  { name: "예술관", category: "building", latOffset: 0.0008, lngOffset: 0.0012 },
  { name: "북악관", category: "building", latOffset: 0.0002, lngOffset: -0.0006 },
  { name: "복지관", category: "building", latOffset: -0.0003, lngOffset: 0.0004 },
  { name: "경상관", category: "building", latOffset: 0.0006, lngOffset: 0.0008 },
  { name: "중앙도서관", category: "building", latOffset: 0.0006, lngOffset: -0.0012 },
  { name: "학생회관 학식당", category: "cafeteria", latOffset: 0.0003, lngOffset: 0.0006 },
  { name: "카페나무(예술관)", category: "store", latOffset: 0.0009, lngOffset: 0.0013 },
  { name: "편의점(CU)", category: "store", latOffset: 0.0002, lngOffset: 0.0011 },
  { name: "복사실", category: "store", latOffset: -0.0006, lngOffset: 0.0002 },
  { name: "기숙사(공학관 옆)", category: "dorm", latOffset: -0.0018, lngOffset: -0.0011 },
];

type PlaceMap = Record<string, { id: string; lat: number; lng: number; name: string }>;

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
    if (!process.env[key]) process.env[key] = value;
  }
}

/** 자식 테이블부터 지워서 FK 제약에 걸리지 않게 한다. */
const WIPE_ORDER = [
  "gathering_comments",
  "gathering_members",
  "gatherings",
  "chat_messages",
  "chat_rooms",
  "completion_proofs",
  "reviews",
  "reports",
  "inquiries",
  "applications",
  "errand_images",
  "escrows",
  "urgent_purchases",
  "point_transactions",
  "notifications",
  "ai_assists",
  "ai_moderations",
  "route_cache",
  "errands",
  "users",
] as const;

async function wipeAll(admin: AdminClient): Promise<void> {
  // errands.selected_application_id → applications.id 순환 참조를 먼저 끊는다.
  const { error: unlinkError } = await admin
    .from("errands")
    .update({ selected_application_id: null, runner_id: null })
    .not("id", "is", null);
  if (unlinkError) throw new Error(`의뢰 참조 해제 실패: ${unlinkError.message}`);

  for (const table of WIPE_ORDER) {
    const { error } = await admin.from(table).delete().not("id", "is", null);
    if (error) throw new Error(`${table} 삭제 실패: ${error.message}`);
  }

  let page = 1;
  for (;;) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) throw new Error(`계정 조회 실패: ${listError.message}`);
    const users = data?.users ?? [];
    if (users.length === 0) break;
    for (const user of users) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) throw new Error(`계정 삭제 실패(${user.email}): ${deleteError.message}`);
    }
    page += 1;
  }
  console.log("기존 회원·의뢰·모임 데이터 삭제 완료.");
}

async function createSchool(admin: AdminClient): Promise<string> {
  const { data, error } = await admin
    .from("schools")
    .upsert(
      {
        name: SCHOOL.name,
        email_domain: SCHOOL.emailDomain,
        center_lat: SCHOOL.centerLat,
        center_lng: SCHOOL.centerLng,
        is_active: true,
      },
      { onConflict: "email_domain" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`학교 생성 실패: ${error?.message}`);
  return data.id;
}

async function createPlaces(admin: AdminClient, schoolId: string): Promise<PlaceMap> {
  await admin.from("campus_places").delete().eq("school_id", schoolId);
  const rows = PLACES.map((place) => ({
    school_id: schoolId,
    name: place.name,
    category: place.category,
    lat: SCHOOL.centerLat + place.latOffset,
    lng: SCHOOL.centerLng + place.lngOffset,
    is_active: true,
  }));
  const { data, error } = await admin.from("campus_places").insert(rows).select("id, name, lat, lng");
  if (error || !data) throw new Error(`장소 생성 실패: ${error?.message}`);
  const byName: PlaceMap = {};
  for (const place of data) byName[place.name] = place;
  return byName;
}

interface CreateMemberArgs {
  email: string;
  realName: string;
  studentNo: string;
  department: string;
  nickname: string;
  points: number;
  schoolId: string;
}

async function createMember(admin: AdminClient, args: CreateMemberArgs): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: args.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`계정 생성 실패(${args.email}): ${error?.message}`);

  const { error: profileError } = await admin.rpc("fn_signup_profile", {
    p_user_id: data.user.id,
    p_school_id: args.schoolId,
    p_email: args.email,
    p_real_name_enc: encryptField(args.realName),
    p_student_no_enc: encryptField(args.studentNo),
    p_student_no_hash: hashStudentNo(args.schoolId, args.studentNo),
    p_department: args.department,
    p_nickname: args.nickname,
  });
  if (profileError) throw new Error(`프로필 생성 실패(${args.email}): ${profileError.message}`);

  const { data: profile } = await admin.from("users").select("point_balance").eq("id", data.user.id).single();
  const delta = args.points - (profile?.point_balance ?? 0);
  if (delta > 0) {
    const { error: pointError } = await admin.rpc("_add_points", {
      p_user_id: data.user.id,
      p_delta: delta,
      p_type: "CHARGE",
      p_errand_id: null,
    });
    if (pointError) throw new Error(`포인트 충전 실패(${args.email}): ${pointError.message}`);
  }

  return data.user.id;
}

/** 오늘/내일 특정 시각을 ISO 문자열로 만든다(모두 현재보다 미래). */
function atHour(dayOffset: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function todayLabel(): string {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()}`;
}

interface ErrandSpec {
  requesterId: string;
  title: string;
  body: string;
  category: string;
  locationType: "campus" | "custom" | "online";
  from: { placeId: string | null; label: string; lat: number | null; lng: number | null };
  to: { placeId: string | null; label: string; lat: number | null; lng: number | null };
  desiredAt: string;
  price: number;
  urgentLevel?: 0 | 1 | 2;
}

async function createErrand(admin: AdminClient, spec: ErrandSpec): Promise<string> {
  const { data, error } = await admin.rpc("fn_create_errand", {
    p_requester_id: spec.requesterId,
    p_title: spec.title,
    p_body: spec.body,
    p_raw_input: spec.body,
    p_category: spec.category,
    p_from_place_id: spec.from.placeId,
    p_from_lat: spec.from.lat,
    p_from_lng: spec.from.lng,
    p_from_label: spec.from.label,
    p_from_detail: null,
    p_to_place_id: spec.to.placeId,
    p_to_lat: spec.to.lat,
    p_to_lng: spec.to.lng,
    p_to_label: spec.to.label,
    p_to_detail: null,
    p_desired_at: spec.desiredAt,
    p_price: spec.price,
    p_ai_suggested_price: spec.price,
    p_urgent_level: spec.urgentLevel ?? 0,
    p_image_url: null,
    p_location_type: spec.locationType,
  });
  if (error || !data) throw new Error(`의뢰 생성 실패(${spec.title}): ${error?.message}`);
  return data.id as string;
}

async function applyTo(admin: AdminClient, errandId: string, applicantId: string, message: string): Promise<string> {
  const { data, error } = await admin.rpc("fn_apply", {
    p_errand_id: errandId,
    p_applicant_id: applicantId,
    p_message: message,
  });
  if (error || !data) throw new Error(`지원 실패: ${error?.message}`);
  return data.id as string;
}

async function askInquiry(
  admin: AdminClient,
  errandId: string,
  authorId: string,
  content: string,
  isSecret: boolean,
): Promise<void> {
  const { error } = await admin.rpc("fn_create_inquiry", {
    p_errand_id: errandId,
    p_author_id: authorId,
    p_content: content,
    p_is_secret: isSecret,
  });
  if (error) throw new Error(`문의 생성 실패: ${error.message}`);
}

const ONLINE_LEG = { placeId: null, label: "온라인", lat: null, lng: null } as const;

function customLeg(label: string) {
  return { placeId: null, label, lat: null, lng: null };
}

function campusLeg(place: { id: string; name: string; lat: number; lng: number }) {
  return { placeId: place.id, label: place.name, lat: place.lat, lng: place.lng };
}

async function seedDemoContent(
  admin: AdminClient,
  schoolId: string,
  places: PlaceMap,
  testId: string,
  memberIds: Record<string, string>,
): Promise<void> {
  const minji = memberIds["minji@kookmin.ac.kr"];
  const jiho = memberIds["jiho@kookmin.ac.kr"];
  const seoyeon = memberIds["seoyeon@kookmin.ac.kr"];
  const dohyun = memberIds["dohyun@kookmin.ac.kr"];
  const hayeon = memberIds["hayeon@kookmin.ac.kr"];

  // --- 요청받은 테스트 케이스 5건 (모집 중) ---
  const recordingId = await createErrand(admin, {
    requesterId: minji,
    title: `AI와 창의적 사고 오늘(${todayLabel()}) 수업 녹음해주실분..`,
    body: "사정이 있어서 수업을 못가게 되었는데 혹시 녹음 하고 보내주실수 있는분 부탁드립니다 ㅜㅜ 사례는 꼭 하겠습니다..!!!",
    category: "etc",
    locationType: "online",
    from: ONLINE_LEG,
    to: ONLINE_LEG,
    desiredAt: atHour(0, 18),
    price: 3000,
  });
  await applyTo(admin, recordingId, jiho, "저 그 수업 듣고 있어요! 녹음해서 보내드릴게요.");
  await askInquiry(admin, recordingId, seoyeon, "녹음 파일은 어떤 형식으로 보내드리면 될까요?", false);

  const usbId = await createErrand(admin, {
    requesterId: jiho,
    title: "맥북 USB 포트 있는사람",
    body: "제발 빌려주세요. 10시 30분 미래관 232 수업인데 그때까지 갖다주세요",
    category: "pickup",
    locationType: "custom",
    from: customLeg("미래관 1층 로비"),
    to: customLeg("미래관 232호"),
    desiredAt: atHour(1, 10, 30),
    price: 2000,
    urgentLevel: 1,
  });
  await applyTo(admin, usbId, hayeon, "C타입 허브 있어요. 수업 전에 갖다드릴게요!");
  await applyTo(admin, usbId, dohyun, "저도 허브 있습니다. 필요하면 말씀해주세요.");

  await createErrand(admin, {
    requesterId: seoyeon,
    title: "예술관 카페나무에서 공학관 올 때 커피 배달해주실분",
    body: "아이스 아메리카노 하나만 배달해주세요. 저 공학관 216 에 있습니다",
    category: "pickup",
    locationType: "campus",
    from: campusLeg(places["카페나무(예술관)"]),
    to: campusLeg(places["공학관"]),
    desiredAt: atHour(0, 17),
    price: 2500,
  });

  const bookId = await createErrand(admin, {
    requesterId: dohyun,
    title: "교재 있으신분 팔아주세요 ㅠㅠ",
    body: "College English 교재 - Media Matters 6th edition (미디어매터스 6판)",
    category: "etc",
    locationType: "online",
    from: ONLINE_LEG,
    to: ONLINE_LEG,
    desiredAt: atHour(1, 13),
    price: 500,
  });
  await askInquiry(admin, bookId, hayeon, "6판 맞나요? 저 5판 가지고 있는데 괜찮으실까요?", false);

  const surveyId = await createErrand(admin, {
    requesterId: hayeon,
    title: "안녕하세요!! 프로젝트 통계자료용 설문조사 한번만 부탁드립니다!",
    body: [
      "AI를 활용한 상담 경험이 있는 분을 대상으로 AI에게 고민을 털어놓거나 위로·조언을 받아본 경험, AI를 찾게 되는 이유와 이용 방식 등을 질문할 예정입니다.",
      "설문 응답 내용은 수업 및 연구 목적으로만 활용되며, 개인을 식별할 수 있는 정보와 분리하여 처리됩니다.",
      "쪽지로 구글폼 완료하신거 인증하시면 포인트 보내드리겠습니다!!",
      "https://forms.gle/abcdefg-1234",
    ].join("\n\n"),
    category: "etc",
    locationType: "online",
    from: ONLINE_LEG,
    to: ONLINE_LEG,
    desiredAt: atHour(2, 20),
    price: 1000,
  });
  await applyTo(admin, surveyId, minji, "설문 참여하겠습니다! 링크 들어가볼게요.");
  await askInquiry(admin, surveyId, jiho, "설문 응답 시간은 얼마나 걸리나요?", true);

  // --- 테스트 계정이 바로 시연할 수 있는 건들 ---

  // 1) 테스트 계정이 올린 의뢰 + 지원자 2명 → '수행자 선택' 화면 시연
  const myErrandId = await createErrand(admin, {
    requesterId: testId,
    title: "중앙도서관에서 북악관까지 노트북 어댑터 갖다주실 분",
    body: "자리를 비울 수 없어서요. 중앙도서관 3층 열람실에 어댑터 두고 왔는데 북악관 204호로 갖다주실 수 있나요?",
    category: "pickup",
    locationType: "campus",
    from: campusLeg(places["중앙도서관"]),
    to: campusLeg(places["북악관"]),
    desiredAt: atHour(0, 19),
    price: 3000,
  });
  await applyTo(admin, myErrandId, minji, "지금 도서관에 있어요! 바로 가능합니다.");
  await applyTo(admin, myErrandId, jiho, "수업 끝나고 20분 내로 갈 수 있어요.");

  // 2) 테스트 계정이 지원한 의뢰 → '지원한 의뢰' 탭 시연
  const appliedErrandId = await createErrand(admin, {
    requesterId: minji,
    title: "복사실에서 과제 출력물 찾아와 주실 분",
    body: "복사실에 맡긴 출력물 찾아서 경상관 쪽으로 가져다주시면 됩니다.",
    category: "print",
    locationType: "campus",
    from: campusLeg(places["복사실"]),
    to: campusLeg(places["경상관"]),
    desiredAt: atHour(0, 18, 30),
    price: 2000,
  });
  await applyTo(admin, appliedErrandId, testId, "제가 복사실 근처예요. 바로 찾아서 갖다드릴게요!");

  // 3) 테스트 계정이 수행자로 매칭된 진행 중 의뢰 → '완료 보고' 시연
  const matchedErrandId = await createErrand(admin, {
    requesterId: seoyeon,
    title: "학식당에서 점심 포장해주실 분 구해요",
    body: "제2학생회관 쪽 학식 포장해서 예술관 실기실로 가져다주세요. 포장비 포함입니다.",
    category: "meal",
    locationType: "campus",
    from: campusLeg(places["학생회관 학식당"]),
    to: campusLeg(places["예술관"]),
    desiredAt: atHour(0, 17, 30),
    price: 4000,
  });
  const matchedApplicationId = await applyTo(admin, matchedErrandId, testId, "제가 학식당 바로 옆이라 가능합니다!");
  const { error: selectError } = await admin.rpc("fn_select_runner", {
    p_errand_id: matchedErrandId,
    p_application_id: matchedApplicationId,
    p_actor_id: seoyeon,
  });
  if (selectError) throw new Error(`수행자 선택 실패: ${selectError.message}`);

  // 4) 완료·후기까지 끝난 의뢰(테스트 계정이 수행) → 포인트 내역·후기·온도 시연
  const doneErrandId = await createErrand(admin, {
    requesterId: dohyun,
    title: "편의점에서 음료 사다주실 분",
    body: "편의점에서 이온음료 2개만 사서 기숙사 1층으로 갖다주세요.",
    category: "pickup",
    locationType: "campus",
    from: campusLeg(places["편의점(CU)"]),
    to: campusLeg(places["기숙사(공학관 옆)"]),
    desiredAt: atHour(0, 16),
    price: 2000,
  });
  const doneApplicationId = await applyTo(admin, doneErrandId, testId, "지금 편의점이라 바로 가능해요!");
  const { error: doneSelectError } = await admin.rpc("fn_select_runner", {
    p_errand_id: doneErrandId,
    p_application_id: doneApplicationId,
    p_actor_id: dohyun,
  });
  if (doneSelectError) throw new Error(`수행자 선택 실패: ${doneSelectError.message}`);
  const { error: reportError } = await admin.rpc("fn_report_completion", {
    p_errand_id: doneErrandId,
    p_runner_id: testId,
    p_photo_url: null,
    p_memo: "기숙사 1층 데스크에 맡겨두었습니다!",
  });
  if (reportError) throw new Error(`완료 보고 실패: ${reportError.message}`);
  const { error: confirmError } = await admin.rpc("fn_confirm_completion", {
    p_errand_id: doneErrandId,
    p_actor_id: dohyun,
  });
  if (confirmError) throw new Error(`완료 확인 실패: ${confirmError.message}`);
  const { error: reviewError } = await admin.rpc("fn_write_review", {
    p_errand_id: doneErrandId,
    p_reviewer_id: dohyun,
    p_rating: 5,
    p_tags: ["시간 약속을 잘 지켜요", "친절해요"],
    p_comment: "엄청 빠르게 갖다주셨어요! 감사합니다.",
  });
  if (reviewError) throw new Error(`후기 작성 실패: ${reviewError.message}`);

  // --- 모임 2건 ---
  const studyId = await createGathering(admin, {
    hostId: minji,
    title: "기말 대비 알고리즘 스터디 모집",
    description: "매주 화/목 저녁에 중앙도서관 스터디룸에서 만나요. 코딩테스트 준비 같이 하실 분!",
    category: "study",
    capacity: 6,
    meetAt: atHour(1, 19),
    placeLabel: "중앙도서관 스터디룸 3",
  });
  await joinGathering(admin, studyId, jiho);
  await joinGathering(admin, studyId, testId);
  await commentGathering(admin, studyId, jiho, "저 자료구조도 같이 보면 좋을 것 같아요!");

  const sportsId = await createGathering(admin, {
    hostId: hayeon,
    title: "주말 아침 러닝 같이 하실 분",
    description: "토요일 아침 8시에 정문에서 모여서 북악스카이웨이 쪽으로 가볍게 달려요. 초보 환영!",
    category: "sports",
    capacity: 8,
    meetAt: atHour(2, 8),
    placeLabel: "정문 앞",
  });
  await joinGathering(admin, sportsId, seoyeon);

  console.log(`의뢰 ${9}건, 모임 2건 생성 완료.`);
}

interface GatheringSpec {
  hostId: string;
  title: string;
  description: string;
  category: string;
  capacity: number;
  meetAt: string;
  placeLabel: string;
}

async function createGathering(admin: AdminClient, spec: GatheringSpec): Promise<string> {
  const { data, error } = await admin.rpc("fn_create_gathering", {
    p_host_id: spec.hostId,
    p_title: spec.title,
    p_description: spec.description,
    p_category: spec.category,
    p_capacity: spec.capacity,
    p_meet_at: spec.meetAt,
    p_place_label: spec.placeLabel,
    p_place_lat: null,
    p_place_lng: null,
  });
  if (error || !data) throw new Error(`모임 생성 실패(${spec.title}): ${error?.message}`);
  return data.id as string;
}

async function joinGathering(admin: AdminClient, gatheringId: string, userId: string): Promise<void> {
  const { error } = await admin.rpc("fn_join_gathering", {
    p_gathering_id: gatheringId,
    p_user_id: userId,
  });
  if (error) throw new Error(`모임 참여 실패: ${error.message}`);
}

async function commentGathering(
  admin: AdminClient,
  gatheringId: string,
  authorId: string,
  content: string,
): Promise<void> {
  const { error } = await admin.rpc("fn_add_gathering_comment", {
    p_gathering_id: gatheringId,
    p_author_id: authorId,
    p_content: content,
  });
  if (error) throw new Error(`모임 댓글 실패: ${error.message}`);
}

async function main(): Promise<void> {
  loadEnvLocal();
  const admin = createAdminClient();

  console.log("기존 데이터 삭제 중...");
  await wipeAll(admin);

  console.log("학교·장소 생성 중...");
  const schoolId = await createSchool(admin);
  const places = await createPlaces(admin, schoolId);

  console.log("계정 생성 중...");
  const testId = await createMember(admin, { ...TEST_ACCOUNT, points: TEST_ACCOUNT.startingPoints, schoolId });
  const memberIds: Record<string, string> = {};
  for (const member of MEMBERS) {
    memberIds[member.email] = await createMember(admin, { ...member, schoolId });
  }

  console.log("시연 데이터 생성 중...");
  await seedDemoContent(admin, schoolId, places, testId, memberIds);

  console.log("\n=== 시연 준비 완료 ===");
  console.log(`테스트 계정: ${TEST_ACCOUNT.email} / ${DEMO_PASSWORD} (닉네임 ${TEST_ACCOUNT.nickname})`);
  console.log(`기타 계정(같은 비밀번호): ${MEMBERS.map((member) => member.email).join(", ")}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
