import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";
import { ActivityRow } from "@/components/errand/activity-row";
import type { Application, Errand } from "@/lib/supabase/types";

interface ApplicationWithErrand extends Application {
  errand: Errand | null;
}

export default async function ActivityPage({ searchParams }: PageProps<"/me/activity">) {
  const { profile } = await requireCurrentUser();
  const params = await searchParams;
  const tab = params.tab === "applied" ? "applied" : "requested";

  const supabase = await createClient();

  const errands: Errand[] = [];

  if (tab === "requested") {
    const { data } = await supabase
      .from("errands")
      .select("*")
      .eq("requester_id", profile.id)
      .order("created_at", { ascending: false })
      .returns<Errand[]>();
    errands.push(...(data ?? []));
  } else {
    const { data } = await supabase
      .from("applications")
      .select("*, errand:errands(*)")
      .eq("applicant_id", profile.id)
      .order("created_at", { ascending: false })
      .returns<ApplicationWithErrand[]>();
    for (const application of data ?? []) {
      if (application.errand) errands.push(application.errand);
    }
  }

  return (
    <main className="flex flex-col gap-4 px-5 pt-6">
      <h1 className="text-xl font-bold text-gray-900">내 활동</h1>

      <div className="flex gap-2">
        <TabLink href="/me/activity" label="요청한 의뢰" active={tab === "requested"} />
        <TabLink href="/me/activity?tab=applied" label="지원한 의뢰" active={tab === "applied"} />
      </div>

      <div className="flex flex-col gap-3">
        {errands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
            아직 활동 내역이 없어요.
          </div>
        ) : (
          errands.map((errand) => <ActivityRow key={errand.id} errand={errand} />)
        )}
      </div>
    </main>
  );
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold",
        active ? "bg-[#3B5BFD] text-white" : "bg-gray-100 text-gray-500",
      )}
    >
      {label}
    </Link>
  );
}
