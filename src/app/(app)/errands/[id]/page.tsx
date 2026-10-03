import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { categoryLabel } from "@/lib/constants";
import { formatKoreanDateTime } from "@/lib/time";
import { formatPoints } from "@/lib/utils";
import { StatusBadge, UrgentBadge } from "@/components/errand/status-badge";
import { CountdownBadge } from "@/components/errand/countdown-badge";
import { ApplyButton } from "@/components/errand/apply-button";
import { ApplicantList, type ApplicationWithProfile } from "@/components/errand/applicant-list";
import { CompletionReportForm } from "@/components/errand/completion-report-form";
import { ConfirmReviewPanel } from "@/components/errand/confirm-review-panel";
import { UrgentUpgradeButtons } from "@/components/errand/urgent-upgrade-buttons";
import { CancelErrandButton } from "@/components/errand/cancel-errand-button";
import { ChatEntryButton } from "@/components/errand/chat-entry-button";
import { InquirySection, type InquiryWithAuthor } from "@/components/errand/inquiry-section";
import { RouteMap } from "@/components/map/route-map";
import type {
  Application,
  CompletionProof,
  Errand,
  InquiryFeedRow,
  PublicProfile,
  Review,
} from "@/lib/supabase/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function fetchProfiles(supabase: Supabase, ids: string[]): Promise<Map<string, PublicProfile>> {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return new Map();

  const { data } = await supabase.from("profiles").select("*").in("id", uniqueIds).returns<PublicProfile[]>();
  return new Map((data ?? []).map((row) => [row.id, row]));
}

interface ApplicationsBranchResult {
  applicationsWithProfiles: ApplicationWithProfile[];
  myApplication: Application | null;
}

/** 요청자면 지원자 목록 + 프로필을, 그 외에는 내 지원 여부를 가져온다(두 쿼리는 상호 배타적). */
async function fetchApplicationsBranch(
  supabase: Supabase,
  errandId: string,
  errandStatus: string,
  isRequester: boolean,
  myUserId: string,
): Promise<ApplicationsBranchResult> {
  if (isRequester && ["RECRUITING", "SELECTING"].includes(errandStatus)) {
    const { data: applications } = await supabase
      .from("applications")
      .select("*")
      .eq("errand_id", errandId)
      .eq("status", "APPLIED")
      .order("created_at", { ascending: true })
      .returns<Application[]>();

    const applicantProfiles = await fetchProfiles(
      supabase,
      (applications ?? []).map((application) => application.applicant_id),
    );
    const applicationsWithProfiles = (applications ?? []).map((application) => ({
      ...application,
      profile: applicantProfiles.get(application.applicant_id) ?? null,
    }));
    return { applicationsWithProfiles, myApplication: null };
  }

  if (!isRequester) {
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("errand_id", errandId)
      .eq("applicant_id", myUserId)
      .maybeSingle<Application>();
    return { applicationsWithProfiles: [], myApplication: data };
  }

  return { applicationsWithProfiles: [], myApplication: null };
}

async function fetchCompletionProof(
  supabase: Supabase,
  errandId: string,
  errandStatus: string,
): Promise<CompletionProof | null> {
  if (!["CONFIRMING", "COMPLETED"].includes(errandStatus)) return null;
  const { data } = await supabase
    .from("completion_proofs")
    .select("*")
    .eq("errand_id", errandId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CompletionProof>();
  return data;
}

async function fetchExistingReview(
  supabase: Supabase,
  errandId: string,
  errandStatus: string,
): Promise<Review | null> {
  if (!["CONFIRMING", "COMPLETED"].includes(errandStatus)) return null;
  const { data } = await supabase.from("reviews").select("*").eq("errand_id", errandId).maybeSingle<Review>();
  return data;
}

async function fetchInquiries(supabase: Supabase, errandId: string): Promise<InquiryWithAuthor[]> {
  const { data: inquiryRows } = await supabase
    .from("inquiries_feed")
    .select("*")
    .eq("errand_id", errandId)
    .order("created_at", { ascending: true })
    .returns<InquiryFeedRow[]>();

  const inquiryAuthorProfiles = await fetchProfiles(
    supabase,
    (inquiryRows ?? []).map((inquiry) => inquiry.author_id),
  );
  return (inquiryRows ?? []).map((inquiry) => ({
    ...inquiry,
    authorNickname: inquiryAuthorProfiles.get(inquiry.author_id)?.nickname ?? null,
  }));
}

export default async function ErrandDetailPage({ params }: PageProps<"/errands/[id]">) {
  const { id } = await params;
  const { profile } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: errand } = await supabase.from("errands").select("*").eq("id", id).single<Errand>();
  if (!errand) {
    notFound();
  }

  const isRequester = errand.requester_id === profile.id;
  const isRunner = errand.runner_id === profile.id;

  const profileIds = [errand.requester_id];
  if (errand.runner_id) profileIds.push(errand.runner_id);

  // 서로 의존하지 않는 다섯 갈래의 조회를 병렬로 실행해 응답 지연을 줄인다.
  const [profilesById, applicationsBranch, completionProof, existingReview, inquiries] = await Promise.all([
    fetchProfiles(supabase, profileIds),
    fetchApplicationsBranch(supabase, id, errand.status, isRequester, profile.id),
    fetchCompletionProof(supabase, id, errand.status),
    fetchExistingReview(supabase, id, errand.status),
    fetchInquiries(supabase, id),
  ]);

  const requesterProfile = profilesById.get(errand.requester_id) ?? null;
  const runnerProfile = errand.runner_id ? (profilesById.get(errand.runner_id) ?? null) : null;
  const { applicationsWithProfiles, myApplication } = applicationsBranch;
  const canInquire = !isRequester && errand.status === "RECRUITING";

  const canChat = Boolean(
    errand.runner_id && ["MATCHED", "CONFIRMING", "COMPLETED"].includes(errand.status) && (isRequester || isRunner),
  );

  const hasRouteCoords = Boolean(
    errand.from_lat !== null && errand.from_lng !== null && errand.to_lat !== null && errand.to_lng !== null,
  );

  const isBlinded = errand.moderation_status === "blinded";
  const canSeeBlindedBanner = isBlinded && (isRequester || profile.role === "admin");

  return (
    <main className="flex flex-col gap-5 px-5 pt-6">
      {canSeeBlindedBanner && (
        <div className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-medium text-white">
          신고가 누적되어 다른 학생에게는 보이지 않는 의뢰예요.
        </div>
      )}

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {categoryLabel(errand.category)}
          </span>
          <UrgentBadge level={errand.urgent_level} />
          <StatusBadge status={errand.status} />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{errand.title}</h1>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{errand.body}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-100 p-4 text-sm">
        <div>
          <p className="text-xs text-gray-400">출발</p>
          <p className="font-medium text-gray-800">{errand.from_label ?? "미지정"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">도착</p>
          <p className="font-medium text-gray-800">{errand.to_label ?? "미지정"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">희망 시각</p>
          <p className="font-medium text-gray-800">{formatKoreanDateTime(errand.desired_at)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">사례금</p>
          <p className="font-bold text-[#3B5BFD]">{formatPoints(errand.price)}</p>
        </div>
      </section>

      {hasRouteCoords && (
        <RouteMap
          from={{ lat: errand.from_lat as number, lng: errand.from_lng as number, label: errand.from_label ?? "출발" }}
          to={{ lat: errand.to_lat as number, lng: errand.to_lng as number, label: errand.to_label ?? "도착" }}
        />
      )}

      <section className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm">
        <span className="text-gray-500">
          요청자 {requesterProfile?.nickname ?? "알 수 없음"} · 지원 {errand.applicant_count}명
        </span>
        <StatusCountdown errand={errand} />
      </section>

      {runnerProfile && (
        <section className="rounded-2xl border border-gray-100 p-4 text-sm">
          <p className="text-xs text-gray-400">수행자</p>
          <p className="font-semibold text-gray-800">
            {runnerProfile.nickname} · {runnerProfile.campus_temp.toFixed(1)}°C
          </p>
        </section>
      )}

      {canChat && <ChatEntryButton errandId={errand.id} />}

      {completionProof && (
        <section className="rounded-2xl border border-gray-100 p-4 text-sm">
          <p className="text-xs text-gray-400">완료 보고</p>
          {completionProof.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={completionProof.photo_url}
              alt="완료 인증 사진"
              className="mt-2 h-40 w-full rounded-xl object-cover"
            />
          )}
          {completionProof.memo && <p className="mt-2 text-gray-600">{completionProof.memo}</p>}
        </section>
      )}

      {/* 요청자 액션 */}
      {isRequester && ["RECRUITING", "SELECTING"].includes(errand.status) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-gray-900">지원자</h2>
          <ApplicantList errandId={errand.id} applications={applicationsWithProfiles} />
          {errand.status === "RECRUITING" && errand.urgent_level === 0 && !isBlinded && (
            <UrgentUpgradeButtons errandId={errand.id} />
          )}
          <CancelErrandButton errandId={errand.id} />
        </section>
      )}

      {isRequester && errand.status === "MATCHED" && (
        <section className="rounded-2xl bg-[#3B5BFD]/5 p-4 text-center text-sm text-[#3B5BFD]">
          수행자가 의뢰를 진행하고 있어요. 완료 보고를 기다려 주세요.
        </section>
      )}

      {isRequester && ["CONFIRMING", "COMPLETED"].includes(errand.status) && (
        <ConfirmReviewPanel errandId={errand.id} status={errand.status} existingReview={existingReview} />
      )}

      {/* 수행자 액션 */}
      {isRunner && errand.status === "MATCHED" && <CompletionReportForm errandId={errand.id} />}
      {isRunner && errand.status === "CONFIRMING" && (
        <section className="rounded-2xl bg-violet-50 p-4 text-center text-sm text-violet-600">
          완료 보고를 마쳤어요. 요청자의 확인을 기다리고 있어요.
        </section>
      )}
      {isRunner && errand.status === "COMPLETED" && (
        <section className="rounded-2xl bg-gray-50 p-4 text-center text-sm text-gray-500">
          수행이 완료되었어요. 수고하셨어요!
        </section>
      )}

      {/* 제3자 액션 */}
      {!isRequester && !isRunner && errand.status === "RECRUITING" && (
        <section className="flex flex-col gap-2">
          {myApplication ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 p-4 text-center text-sm text-gray-500">
              <p>
                {myApplication.status === "SELECTED"
                  ? "이 의뢰의 수행자로 선택되었어요!"
                  : myApplication.status === "NOT_SELECTED"
                    ? "아쉽지만 다른 지원자가 선택되었어요."
                    : "지원 완료! 선택을 기다리고 있어요."}
              </p>
              {myApplication.status === "APPLIED" && (
                <ChatEntryButton errandId={errand.id} label="요청자와 채팅하기" />
              )}
            </div>
          ) : (
            <ApplyButton errandId={errand.id} />
          )}
        </section>
      )}

      <InquirySection errandId={errand.id} isRequester={isRequester} canInquire={canInquire} inquiries={inquiries} />
    </main>
  );
}

function StatusCountdown({ errand }: { errand: Errand }) {
  if (errand.status === "RECRUITING") {
    return <CountdownBadge deadlineIso={errand.recruit_deadline_at} prefix="지원 마감까지" />;
  }
  if (errand.status === "SELECTING") {
    return <CountdownBadge deadlineIso={errand.select_deadline_at} prefix="선택 마감까지" />;
  }
  if (errand.status === "CONFIRMING") {
    return <CountdownBadge deadlineIso={errand.confirm_deadline_at} prefix="자동 확인까지" />;
  }
  return null;
}
