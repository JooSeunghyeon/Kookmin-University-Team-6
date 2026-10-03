"use client";

import { useEffect } from "react";
import { useKakaoMap } from "@/lib/kakao/use-kakao-map";
import type { LatLng } from "@/lib/geo";

/** 모임 상세에 쓰는 단일 마커 지도(수정 불가, 표시 전용). */
export function GatheringPlaceMap({ point }: { point: LatLng }) {
  const { containerRef, map, isLoading, error } = useKakaoMap({ center: point, level: 4 });

  useEffect(() => {
    if (!map) return;
    const kakaoSdk = window.kakao;
    const marker = new kakaoSdk.maps.Marker({ position: new kakaoSdk.maps.LatLng(point.lat, point.lng), map });
    return () => marker.setMap(null);
  }, [map, point.lat, point.lng]);

  if (error) {
    return <div className="flex h-36 items-center justify-center text-xs text-gray-400">{error}</div>;
  }

  return (
    <div className="relative h-36 w-full overflow-hidden rounded-xl bg-gray-100">
      <div ref={containerRef} className="h-full w-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
          지도를 불러오는 중...
        </div>
      )}
    </div>
  );
}
