import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import type { School } from "@/lib/supabase/types";
import { NewGatheringForm } from "./_components/new-gathering-form";

export default async function NewGatheringPage() {
  const { profile } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("id", profile.school_id)
    .single<School>();

  const schoolCenter = { lat: school?.center_lat ?? 37.61, lng: school?.center_lng ?? 127.026 };

  return (
    <main className="flex flex-col gap-5 px-5 pt-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">모임 만들기</h1>
        <p className="mt-1 text-sm text-gray-500">함께할 사람을 모아보세요</p>
      </header>
      <NewGatheringForm schoolCenter={schoolCenter} />
    </main>
  );
}
