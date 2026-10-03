import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { ErrandClusterMap, type MapErrand } from "@/components/map/errand-cluster-map";

export default async function MapPage() {
  await requireCurrentUser();
  const supabase = await createClient();

  const { data: errands } = await supabase
    .from("errands")
    .select("id, title, price, category, from_lat, from_lng, from_label, applicant_count")
    .eq("status", "RECRUITING")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<MapErrand[]>();

  return (
    <main className="flex flex-col gap-3 pt-4">
      <ErrandClusterMap errands={errands ?? []} />
    </main>
  );
}
