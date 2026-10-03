"use client";

import { useMemo, useState } from "react";
import { ChevronDown, MapPin, Search } from "lucide-react";
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
  value: LegValue;
  onChange: (value: LegValue) => void;
}

/** 자유 텍스트로 위치를 적는 필드. */
export function CustomLocationField({ fieldLabel, value, onChange }: CustomLocationFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700">{fieldLabel}</span>
      <input
        value={value.label}
        onChange={(event) => onChange({ placeId: null, label: event.target.value, lat: null, lng: null })}
        placeholder="예: 기숙사 1층 로비, 정문 앞 스타벅스"
        maxLength={60}
        className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-[#3B5BFD] focus:ring-2 focus:ring-[#3B5BFD]/20"
      />
    </div>
  );
}
