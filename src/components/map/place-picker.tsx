"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MapPin, Search, X } from "lucide-react";
import { CAMPUS_RADIUS_METERS } from "@/lib/constants";
import { haversineMeters, type LatLng } from "@/lib/geo";
import { useKakaoMap } from "@/lib/kakao/use-kakao-map";
import type { CampusPlace } from "@/lib/supabase/types";

export interface LegValue {
  placeId: string | null;
  label: string;
  lat: number | null;
  lng: number | null;
}

export const EMPTY_LEG: LegValue = { placeId: null, label: "", lat: null, lng: null };

interface CampusPlaceFieldProps {
  fieldLabel: string;
  places: CampusPlace[];
  value: LegValue;
  onSelect: (value: LegValue) => void;
}

/** 캠퍼스 장소 목록에서 검색해 고르는 드롭다운 필드(출발/도착 각각에 쓰인다). */
export function CampusPlaceField({ fieldLabel, places, value, onSelect }: CampusPlaceFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const filtered = useMemo(
    () => places.filter((place) => place.name.toLowerCase().includes(keyword.trim().toLowerCase())),
    [places, keyword],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700">{fieldLabel}</span>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-12 items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-left text-base outline-none focus:border-[#3B5BFD] focus:ring-2 focus:ring-[#3B5BFD]/20"
      >
        <span className={value.label ? "text-gray-900" : "text-gray-400"}>{value.label || "선택해 주세요"}</span>
        <ChevronDown size={18} className="shrink-0 text-gray-400" />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3">
            <Search size={16} className="text-gray-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="장소 이름으로 검색"
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {filtered.length === 0 && <p className="py-4 text-center text-xs text-gray-400">검색 결과가 없어요.</p>}
            {filtered.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  onSelect({ placeId: place.id, label: place.name, lat: place.lat, lng: place.lng });
                  setIsOpen(false);
                  setKeyword("");
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <MapPin size={15} className="shrink-0 text-gray-400" />
                {place.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CustomLocationFieldProps {
  fieldLabel: string;
  schoolCenter: LatLng;
  value: LegValue;
  onChange: (value: LegValue) => void;
}

/** 자유 텍스트로 위치를 적고, 선택적으로 학교 2km 반경 지도에서 핀을 찍을 수 있는 필드. */
export function CustomLocationField({ fieldLabel, schoolCenter, value, onChange }: CustomLocationFieldProps) {
  const [showMap, setShowMap] = useState(value.lat !== null && value.lng !== null);
  const [mapError, setMapError] = useState<string | null>(null);
  const pin: LatLng | null = value.lat !== null && value.lng !== null ? { lat: value.lat, lng: value.lng } : null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700">{fieldLabel}</span>
      <input
        value={value.label}
        onChange={(event) => onChange({ ...value, label: event.target.value })}
        placeholder="예: 기숙사 1층 로비, 정문 앞 스타벅스"
        maxLength={60}
        className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-[#3B5BFD] focus:ring-2 focus:ring-[#3B5BFD]/20"
      />

      <button
        type="button"
        onClick={() => setShowMap((open) => !open)}
        className="flex items-center gap-1 self-start text-xs font-semibold text-[#3B5BFD]"
      >
        <MapPin size={13} />
        {showMap ? "지도 닫기" : "지도에서 위치 지정하기(선택)"}
      </button>

      {showMap && (
        <LocationPinMap
          center={pin ?? schoolCenter}
          schoolCenter={schoolCenter}
          pin={pin}
          onPick={(nextPin) => {
            const distance = haversineMeters(schoolCenter, nextPin);
            if (distance > CAMPUS_RADIUS_METERS) {
              setMapError("학교에서 2km 이내 위치만 선택할 수 있어요.");
              return;
            }
            setMapError(null);
            onChange({ ...value, placeId: null, lat: nextPin.lat, lng: nextPin.lng });
          }}
        />
      )}
      {mapError && <p className="text-xs text-[#F04452]">{mapError}</p>}
      {pin && (
        <button
          type="button"
          onClick={() => onChange({ ...value, lat: null, lng: null })}
          className="flex items-center gap-1 self-start text-xs text-gray-400"
        >
          <X size={12} />
          좌표 지우기
        </button>
      )}
    </div>
  );
}

function LocationPinMap({
  center,
  schoolCenter,
  pin,
  onPick,
}: {
  center: LatLng;
  schoolCenter: LatLng;
  pin: LatLng | null;
  onPick: (pin: LatLng) => void;
}) {
  const { containerRef, map, isLoading, error } = useKakaoMap({ center, level: 4 });

  useEffect(() => {
    if (!map) return;
    const kakaoSdk = window.kakao;

    const circle = new kakaoSdk.maps.Circle({
      center: new kakaoSdk.maps.LatLng(schoolCenter.lat, schoolCenter.lng),
      radius: CAMPUS_RADIUS_METERS,
      strokeWeight: 1,
      strokeColor: "#3B5BFD",
      strokeOpacity: 0.5,
      fillColor: "#3B5BFD",
      fillOpacity: 0.08,
    });
    circle.setMap(map);

    const clickHandler = (mouseEvent: kakao.maps.MapMouseEvent) => {
      onPick({ lat: mouseEvent.latLng.getLat(), lng: mouseEvent.latLng.getLng() });
    };
    kakaoSdk.maps.event.addListener(map, "click", clickHandler);

    return () => {
      circle.setMap(null);
      kakaoSdk.maps.event.removeListener(map, "click", clickHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schoolCenter·onPick은 세션 동안 사실상 고정이다.
  }, [map]);

  useEffect(() => {
    if (!map || !pin) return;
    const kakaoSdk = window.kakao;
    const marker = new kakaoSdk.maps.Marker({ position: new kakaoSdk.maps.LatLng(pin.lat, pin.lng), map });
    return () => marker.setMap(null);
  }, [map, pin]);

  if (error) {
    return <div className="flex h-36 items-center justify-center text-xs text-gray-400">{error}</div>;
  }

  return (
    <div className="relative h-36 w-full overflow-hidden rounded-lg bg-gray-100">
      <div ref={containerRef} className="h-full w-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
          지도를 불러오는 중...
        </div>
      )}
      {!isLoading && !pin && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-md bg-white/90 px-2 py-1 text-center text-[11px] text-gray-500">
          원 안을 탭해서 위치를 지정하세요
        </div>
      )}
    </div>
  );
}
