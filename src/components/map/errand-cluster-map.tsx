"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { categoryLabel } from "@/lib/constants";
import { formatPoints } from "@/lib/utils";
import { useKakaoMap } from "@/lib/kakao/use-kakao-map";
import type { LatLng } from "@/lib/geo";
import type { Errand } from "@/lib/supabase/types";

export type MapErrand = Pick<
  Errand,
  "id" | "title" | "price" | "category" | "from_lat" | "from_lng" | "from_label" | "applicant_count"
>;

// 국민대학교 정릉캠퍼스 대략 중심 좌표. 좌표가 있는 의뢰가 하나도 없을 때의 기본값이다.
const DEFAULT_CENTER: LatLng = { lat: 37.6100, lng: 127.0260 };

interface ErrandClusterMapProps {
  errands: MapErrand[];
}

/** 모집 중인 의뢰를 출발지 좌표 기준으로 지도에 클러스터 마커로 보여주는 /map 탭 지도. */
export function ErrandClusterMap({ errands }: ErrandClusterMapProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<MapErrand | null>(null);
  const located = errands.filter((errand) => errand.from_lat !== null && errand.from_lng !== null);
  const center = located[0] ? { lat: located[0].from_lat as number, lng: located[0].from_lng as number } : DEFAULT_CENTER;
  const { containerRef, map, isLoading, error } = useKakaoMap({ center, level: 5 });

  useEffect(() => {
    if (!map) return;

    const kakaoSdk = window.kakao;
    const markers = located.map((errand) => {
      const marker = new kakaoSdk.maps.Marker({
        position: new kakaoSdk.maps.LatLng(errand.from_lat as number, errand.from_lng as number),
        title: errand.title,
      });
      kakaoSdk.maps.event.addListener(marker, "click", () => setSelected(errand));
      return marker;
    });

    const clusterer = new kakaoSdk.maps.MarkerClusterer({ map, averageCenter: true, minLevel: 6, markers });

    if (markers.length > 0) {
      const bounds = new kakaoSdk.maps.LatLngBounds();
      markers.forEach((marker) => bounds.extend(marker.getPosition()));
      map.setBounds(bounds, 64);
    }

    return () => {
      clusterer.clear();
      markers.forEach((marker) => marker.setMap(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- located는 errands prop에서 파생되며 매 렌더 새 배열이라 길이로 비교한다.
  }, [map, located.length]);

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-1 px-5 text-center text-sm text-gray-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-128px)] min-h-[420px] w-full">
      <div ref={containerRef} className="h-full w-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-gray-400">
          지도를 불러오는 중...
        </div>
      )}
      {!isLoading && located.length === 0 && (
        <div className="absolute inset-x-5 top-5 rounded-2xl bg-white px-4 py-3 text-center text-xs text-gray-400 shadow-sm">
          좌표가 있는 모집 중인 의뢰가 아직 없어요.
        </div>
      )}
      {selected && (
        <button
          type="button"
          onClick={() => router.push(`/errands/${selected.id}`)}
          className="absolute inset-x-4 bottom-4 flex flex-col gap-1 rounded-2xl bg-white p-4 text-left shadow-lg"
        >
          <span className="text-xs font-medium text-gray-500">{categoryLabel(selected.category)}</span>
          <span className="line-clamp-1 text-sm font-bold text-gray-900">{selected.title}</span>
          <span className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-bold text-[#3B5BFD]">{formatPoints(selected.price)}</span>
            <span>
              {selected.from_label ?? "출발지 미지정"} · 지원 {selected.applicant_count}명
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
