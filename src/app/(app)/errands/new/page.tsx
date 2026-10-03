import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import type { CampusPlace } from "@/lib/supabase/types";
import { NewErrandForm } from "./_components/new-errand-form";

export default async function NewErrandPage() {
  const { profile } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: places } = await supabase
    .from("campus_places")
    .select("*")
    .eq("school_id", profile.school_id)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .returns<CampusPlace[]>();

  return (
    <main className="flex flex-col gap-5 px-5 pt-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">의뢰 작성</h1>
        <p className="mt-1 text-sm text-gray-500">무엇을 부탁하고 싶으신가요?</p>
      </header>
      <NewErrandForm places={places ?? []} pointBalance={profile.point_balance} />
    </main>
  );
}
