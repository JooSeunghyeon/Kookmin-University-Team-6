import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { CategoryChipBar } from "@/components/errand/category-chip-bar";
import { ErrandCard } from "@/components/errand/errand-card";
import { ModeSwitch, type HomeMode } from "@/components/home/mode-switch";
import { RequestModeDashboard } from "@/components/home/request-mode-dashboard";
import type { Errand } from "@/lib/supabase/types";

function readMode(rawMode: string | string[] | undefined): HomeMode {
  return rawMode === "request" ? "request" : "help";
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { profile } = await requireCurrentUser();
  const params = await searchParams;
  const mode = readMode(params.mode);
  const category = typeof params.category === "string" ? params.category : undefined;
  const supabase = await createClient();

  if (mode === "request") {
    const { data: myErrands } = await supabase
      .from("errands")
      .select("*")
      .eq("requester_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<Errand[]>();

    return (
      <main className="flex flex-col gap-4 pt-6">
        <ModeSwitch mode={mode} />
        <RequestModeDashboard nickname={profile.nickname} myErrands={myErrands ?? []} />
      </main>
    );
  }

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
      <ModeSwitch mode={mode} />

      <header className="px-5">
        <p className="text-sm text-gray-500">{profile.nickname}님, 도와줄 의뢰를 찾아보세요</p>
      </header>

      <CategoryChipBar activeCategory={category} />

      <section className="flex flex-col gap-3 px-5">
        {!errands || errands.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
            <Building2 size={30} className="text-gray-300" />
            아직 모집 중인 의뢰가 없어요.
          </div>
        ) : (
          errands.map((errand) => <ErrandCard key={errand.id} errand={errand} />)
        )}
      </section>
    </main>
  );
}
