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
import type {
  Application,
  CompletionProof,
  Errand,
  InquiryFeedRow,
  PublicProfile,
  Review,
} from "@/lib/supabase/types";

async function fetchProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, PublicProfile>> {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return new Map();

  const { data } = await supabase.from("profiles").select("*").in("id", uniqueIds).returns<PublicProfile[]>();
  return new Map((data ?? []).map((row) => [row.id, row]));
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
  const profilesById = await fetchProfiles(supabase, profileIds);
  const requesterProfile = profilesById.get(errand.requester_id) ?? null;
  const runnerProfile = errand.runner_id ? (profilesById.get(errand.runner_id) ?? null) : null;

  let applicationsWithProfiles: ApplicationWithProfile[] = [];
  let myApplication: Application | null = null;

  if (isRequester && ["RECRUITING", "SELECTING"].includes(errand.status)) {
    const { data: applications } = await supabase
      .from("applications")
      .select("*")
      .eq("errand_id", id)
      .eq("status", "APPLIED")
      .order("created_at", { ascending: true })
      .returns<Application[]>();

    const applicantProfiles = await fetchProfiles(
      supabase,
      (applications ?? []).map((application) => application.applicant_id),
    );
    applicationsWithProfiles = (applications ?? []).map((application) => ({
      ...application,
      profile: applicantProfiles.get(application.applicant_id) ?? null,
    }));
  } else if (!isRequester) {
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("errand_id", id)
      .eq("applicant_id", profile.id)
      .maybeSingle<Application>();
    myApplication = data;
  }

  let completionProof: CompletionProof | null = null;
  if (["CONFIRMING", "COMPLETED"].includes(errand.status)) {
    const { data } = await supabase
      .from("completion_proofs")
      .select("*")
      .eq("errand_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<CompletionProof>();
    completionProof = data;
  }

  let existingReview: Review | null = null;
  if (["CONFIRMING", "COMPLETED"].includes(errand.status)) {
    const { data } = await supabase.from("reviews").select("*").eq("errand_id", id).maybeSingle<Review>();
    existingReview = data;
  }

  const { data: inquiryRows } = await supabase
    .from("inquiries_feed")
    .select("*")
    .eq("errand_id", id)
    .order("created_at", { ascending: true })
    .returns<InquiryFeedRow[]>();

  const inquiryAuthorProfiles = await fetchProfiles(
    supabase,
    (inquiryRows ?? []).map((inquiry) => inquiry.author_id),
  );
  const inquiries: InquiryWithAuthor[] = (inquiryRows ?? []).map((inquiry) => ({
    ...inquiry,
    authorNickname: inquiryAuthorProfiles.get(inquiry.author_id)?.nickname ?? null,
  }));
  const canInquire = !isRequester && errand.status === "RECRUITING";

  const canChat = Boolean(
    errand.runner_id && ["MATCHED", "CONFIRMING", "COMPLETED"].includes(errand.status) && (isRequester || isRunner),
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
            <div className="rounded-2xl bg-gray-50 p-4 text-center text-sm text-gray-500">
              {myApplication.status === "SELECTED"
                ? "이 의뢰의 수행자로 선택되었어요!"
                : myApplication.status === "NOT_SELECTED"
                  ? "아쉽지만 다른 지원자가 선택되었어요."
                  : "지원 완료! 선택을 기다리고 있어요."}
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
