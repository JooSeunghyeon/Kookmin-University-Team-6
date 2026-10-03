import { requireCurrentUser } from "@/lib/auth/current-user";
import { NicknameForm } from "./_components/nickname-form";
import { LogoutButton } from "./_components/logout-button";

export default async function SettingsPage() {
  const { profile } = await requireCurrentUser();

  return (
    <main className="flex flex-col gap-6 px-5 pt-6">
      <h1 className="text-xl font-bold text-gray-900">설정</h1>

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4">
        <h2 className="text-sm font-bold text-gray-900">닉네임 변경</h2>
        <NicknameForm currentNickname={profile.nickname} nicknameChangedAt={profile.nickname_changed_at} />
      </section>

      <LogoutButton />
    </main>
  );
}
