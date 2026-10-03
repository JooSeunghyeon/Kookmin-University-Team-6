import { requireCurrentUser } from "@/lib/auth/current-user";
import { NewGatheringForm } from "./_components/new-gathering-form";

export default async function NewGatheringPage() {
  await requireCurrentUser();

  return (
    <main className="flex flex-col gap-5 px-5 pt-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">모임 만들기</h1>
        <p className="mt-1 text-sm text-gray-500">함께할 사람을 모아보세요</p>
      </header>
      <NewGatheringForm />
    </main>
  );
}
