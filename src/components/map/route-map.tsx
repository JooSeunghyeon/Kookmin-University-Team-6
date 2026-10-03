"use client";

import { useEffect } from "react";
import { Navigation } from "lucide-react";
import { useKakaoMap } from "@/lib/kakao/use-kakao-map";
import { haversineMeters, type LatLng } from "@/lib/geo";

interface RoutePoint extends LatLng {
  label: string;
}

interface RouteMapProps {
  from: RoutePoint;
  to: RoutePoint;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function buildDirectionsUrl(from: RoutePoint, to: RoutePoint): string {
  const fromSegment = `${encodeURIComponent(from.label)},${from.lat},${from.lng}`;
  const toSegment = `${encodeURIComponent(to.label)},${to.lat},${to.lng}`;
  return `https://map.kakao.com/link/from/${fromSegment}/to/${toSegment}`;
}

/** 의뢰 상세의 출발·도착 지점을 지도 위 두 마커와 경로선으로 보여주고, 카카오맵 길찾기로 연결한다. */
export function RouteMap({ from, to }: RouteMapProps) {
  const midpoint: LatLng = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
  const { containerRef, map, isLoading, error } = useKakaoMap({ center: midpoint, level: 5 });

  useEffect(() => {
    if (!map) return;

    const kakaoSdk = window.kakao;
    const fromLatLng = new kakaoSdk.maps.LatLng(from.lat, from.lng);
    const toLatLng = new kakaoSdk.maps.LatLng(to.lat, to.lng);

    const fromMarker = new kakaoSdk.maps.Marker({ position: fromLatLng, map, title: from.label });
    const toMarker = new kakaoSdk.maps.Marker({ position: toLatLng, map, title: to.label });
    const polyline = new kakaoSdk.maps.Polyline({
      path: [fromLatLng, toLatLng],
      strokeWeight: 4,
      strokeColor: "#3B5BFD",
      strokeOpacity: 0.8,
      strokeStyle: "shortdash",
    });
    polyline.setMap(map);

    const bounds = new kakaoSdk.maps.LatLngBounds();
    bounds.extend(fromLatLng);
    bounds.extend(toLatLng);
    map.setBounds(bounds, 56);

    return () => {
      fromMarker.setMap(null);
      toMarker.setMap(null);
      polyline.setMap(null);
    };
  }, [map, from.lat, from.lng, from.label, to.lat, to.lng, to.label]);

  if (error) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-2xl bg-gray-50 text-xs text-gray-400">
        <p>지도를 불러오지 못했어요.</p>
      </div>
    );
  }

  const distanceMeters = haversineMeters(from, to);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100">
      <div className="relative h-44 w-full bg-gray-100">
        <div ref={containerRef} className="h-full w-full" />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            지도를 불러오는 중...
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 text-xs text-gray-500">
        <span>직선 거리 약 {formatDistance(distanceMeters)}</span>
        <a
          href={buildDirectionsUrl(from, to)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 font-semibold text-[#3B5BFD]"
        >
          <Navigation size={14} />
          길찾기
        </a>
      </div>
    </div>
  );
}
