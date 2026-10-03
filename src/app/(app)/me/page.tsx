import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { formatPoints } from "@/lib/utils";

export default async function MyPage() {
  const { profile } = await requireCurrentUser();

  return (
    <main className="flex flex-col gap-5 px-5 pt-6">
      <section className="flex flex-col items-center gap-2 rounded-2xl bg-[#3B5BFD]/5 p-6 text-center">
        <span className="text-3xl">🙂</span>
        <h1 className="text-lg font-bold text-gray-900">{profile.nickname}</h1>
        <p className="text-sm text-gray-500">
          {profile.department ?? "학과 미입력"} · 완료 {profile.completed_count}회
        </p>
        <p className="text-sm font-semibold text-[#3B5BFD]">매너 온도 {profile.campus_temp.toFixed(1)}°C</p>
        {profile.status !== "active" && (
          <p className="mt-1 rounded-full bg-[#F04452]/10 px-3 py-1 text-xs font-semibold text-[#F04452]">
            이용이 제한된 계정이에요
          </p>
        )}
      </section>

      <nav className="flex flex-col divide-y divide-gray-100 rounded-2xl border border-gray-100">
        <MenuLink href="/me/points" label="포인트 내역" trailing={formatPoints(profile.point_balance)} />
        <MenuLink href="/me/activity" label="내 활동" />
        <MenuLink href="/me/settings" label="설정" />
      </nav>
    </main>
  );
}

function MenuLink({ href, label, trailing }: { href: string; label: string; trailing?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-4 text-sm">
      <span className="font-medium text-gray-800">{label}</span>
      <span className="text-gray-400">{trailing ?? "›"}</span>
    </Link>
  );
}
