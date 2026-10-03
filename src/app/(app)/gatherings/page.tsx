import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { GatheringCategoryChipBar } from "@/components/gathering/gathering-category-chip-bar";
import { GatheringCard } from "@/components/gathering/gathering-card";
import type { Gathering, GatheringMember } from "@/lib/supabase/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function fetchOpenGatherings(supabase: Supabase, category: string | undefined): Promise<Gathering[]> {
  let query = supabase.from("gatherings").select("*").eq("status", "OPEN").order("created_at", { ascending: false }).limit(50);
  if (category) {
    query = query.eq("category", category);
  }
  const { data } = await query.returns<Gathering[]>();
  return data ?? [];
}

async function fetchMyGatherings(supabase: Supabase, userId: string): Promise<Gathering[]> {
  const { data: memberships } = await supabase
    .from("gathering_members")
    .select("*")
    .eq("user_id", userId)
    .returns<GatheringMember[]>();
  const gatheringIds = (memberships ?? []).map((membership) => membership.gathering_id);
  if (gatheringIds.length === 0) return [];
  const { data } = await supabase
    .from("gatherings")
    .select("*")
    .in("id", gatheringIds)
    .order("created_at", { ascending: false })
    .returns<Gathering[]>();
  return data ?? [];
}

export default async function GatheringsPage({ searchParams }: PageProps<"/gatherings">) {
  const { profile } = await requireCurrentUser();
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const isMineFilter = params.filter === "mine";

  const supabase = await createClient();
  const gatherings = isMineFilter
    ? await fetchMyGatherings(supabase, profile.id)
    : await fetchOpenGatherings(supabase, category);

  return (
    <main className="flex flex-col gap-4 pt-6">
      <header className="flex items-center justify-between px-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isMineFilter ? "내 모임" : "모임"}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isMineFilter ? "참여 중이거나 만든 모임이에요" : "스터디, 운동 등 함께할 사람을 모아보세요"}
          </p>
        </div>
        <Link
          href="/gatherings/new"
          className="flex h-10 items-center gap-1.5 rounded-xl bg-[#3B5BFD] px-3.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          만들기
        </Link>
      </header>

      <div className="flex items-center justify-between px-5">
        {isMineFilter ? (
          <Link href="/gatherings" className="text-xs font-semibold text-[#3B5BFD]">
            ← 전체 모임 보기
          </Link>
        ) : (
          <Link href="/gatherings?filter=mine" className="text-xs font-semibold text-[#3B5BFD]">
            내 모임만 보기 →
          </Link>
        )}
      </div>

      {!isMineFilter && <GatheringCategoryChipBar activeCategory={category} />}

      <section className="flex flex-col gap-3 px-5">
        {gatherings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
            <Users size={30} className="text-gray-300" />
            {isMineFilter ? "아직 참여 중인 모임이 없어요." : "아직 모집 중인 모임이 없어요."}
          </div>
        ) : (
          gatherings.map((gathering) => <GatheringCard key={gathering.id} gathering={gathering} />)
        )}
      </section>
    </main>
  );
}
