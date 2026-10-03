import { requireCurrentUser } from "@/lib/auth/current-user";

// TODO(map 단계): 카카오맵 로더 + 모집 중 의뢰 마커 클러스터링으로 교체 예정 (F-25, F-31).
export default async function MapPage() {
  await requireCurrentUser();

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-2 px-5 text-center">
      <span className="text-3xl">🗺️</span>
      <p className="text-sm text-gray-400">지도 화면은 곧 추가돼요.</p>
    </main>
  );
}
