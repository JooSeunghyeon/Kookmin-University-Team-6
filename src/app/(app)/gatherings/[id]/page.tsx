import { notFound } from "next/navigation";
import { Clock, Crown, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { gatheringCategoryLabel, GATHERING_STATUS_LABEL } from "@/lib/constants";
import { formatKoreanDateTime } from "@/lib/time";
import { GatheringActions } from "@/components/gathering/gathering-actions";
import { GatheringComments, type GatheringCommentWithAuthor } from "@/components/gathering/gathering-comments";
import type { Gathering, GatheringComment, GatheringMember, PublicProfile } from "@/lib/supabase/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function fetchProfiles(supabase: Supabase, ids: string[]): Promise<Map<string, PublicProfile>> {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("*").in("id", uniqueIds).returns<PublicProfile[]>();
  return new Map((data ?? []).map((row) => [row.id, row]));
}

export default async function GatheringDetailPage({ params }: PageProps<"/gatherings/[id]">) {
  const { id } = await params;
  const { profile } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: gathering } = await supabase.from("gatherings").select("*").eq("id", id).single<Gathering>();
  if (!gathering) {
    notFound();
  }

  const [{ data: members }, { data: comments }] = await Promise.all([
    supabase
      .from("gathering_members")
      .select("*")
      .eq("gathering_id", id)
      .order("joined_at", { ascending: true })
      .returns<GatheringMember[]>(),
    supabase
      .from("gathering_comments")
      .select("*")
      .eq("gathering_id", id)
      .order("created_at", { ascending: true })
      .returns<GatheringComment[]>(),
  ]);

  const memberRows = members ?? [];
  const commentRows = comments ?? [];
  const profilesById = await fetchProfiles(supabase, [
    gathering.host_id,
    ...memberRows.map((member) => member.user_id),
    ...commentRows.map((comment) => comment.author_id),
  ]);

  const isHost = gathering.host_id === profile.id;
  const isMember = memberRows.some((member) => member.user_id === profile.id);
  const isFull = gathering.member_count >= gathering.capacity;
  const hostProfile = profilesById.get(gathering.host_id) ?? null;

  const commentsWithAuthor: GatheringCommentWithAuthor[] = commentRows.map((comment) => ({
    id: comment.id,
    content: comment.content,
    created_at: comment.created_at,
    authorNickname: profilesById.get(comment.author_id)?.nickname ?? null,
  }));

  return (
    <main className="flex flex-col gap-5 px-5 pt-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {gatheringCategoryLabel(gathering.category)}
          </span>
          {gathering.status !== "OPEN" && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-400">
              {GATHERING_STATUS_LABEL[gathering.status]}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{gathering.title}</h1>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{gathering.description}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-100 p-4 text-sm">
        <div className="col-span-2 flex items-center gap-1.5 text-gray-800">
          <MapPin size={14} className="shrink-0 text-gray-400" />
          <span className="font-medium">{gathering.place_label ?? "장소 미정"}</span>
        </div>
        {gathering.meet_at && (
          <div className="col-span-2 flex items-center gap-1.5 text-gray-800">
            <Clock size={14} className="shrink-0 text-gray-400" />
            <span className="font-medium">{formatKoreanDateTime(gathering.meet_at)}</span>
          </div>
        )}
        <div className="col-span-2 flex items-center gap-1.5">
          <Users size={14} className="shrink-0 text-gray-400" />
          <span className="font-bold text-[#3B5BFD]">
            {gathering.member_count}/{gathering.capacity}명
          </span>
        </div>
      </section>

      <section className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
        모임장 {hostProfile?.nickname ?? "알 수 없음"}
      </section>

      <GatheringActions
        gatheringId={gathering.id}
        isHost={isHost}
        isMember={isMember}
        isFull={isFull}
        isOpen={gathering.status === "OPEN"}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-gray-900">참여자 {memberRows.length}명</h2>
        <div className="flex flex-wrap gap-1.5">
          {memberRows.map((member) => (
            <span
              key={member.id}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
            >
              {member.user_id === gathering.host_id && <Crown size={11} className="text-amber-500" />}
              {profilesById.get(member.user_id)?.nickname ?? "알 수 없음"}
            </span>
          ))}
        </div>
      </section>

      <GatheringComments gatheringId={gathering.id} comments={commentsWithAuthor} />
    </main>
  );
}
