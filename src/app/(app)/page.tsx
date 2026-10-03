import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { CategoryChipBar } from "@/components/errand/category-chip-bar";
import { ErrandCard } from "@/components/errand/errand-card";
import type { Errand } from "@/lib/supabase/types";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { profile } = await requireCurrentUser();
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("errands")
    .select("*")
    .eq("status", "RECRUITING")
    .order("urgent_level", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: errands } = await query.returns<Errand[]>();

  return (
    <main className="flex flex-col gap-4 pt-6">
      <header className="flex items-center justify-between px-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">캠퍼스런</h1>
          <p className="text-sm text-gray-500">{profile.nickname}님, 오늘도 가볍게 부탁해 보세요</p>
        </div>
      </header>

      <CategoryChipBar activeCategory={category} />

      <section className="flex flex-col gap-3 px-5">
        {!errands || errands.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
            <span className="text-3xl">🏫</span>
            아직 모집 중인 의뢰가 없어요.
          </div>
        ) : (
          errands.map((errand) => <ErrandCard key={errand.id} errand={errand} />)
        )}
      </section>
    </main>
  );
}
