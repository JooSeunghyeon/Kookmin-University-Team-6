"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GATHERING_CATEGORIES, MIN_GATHERING_CAPACITY, MAX_GATHERING_CAPACITY, type GatheringCategoryValue } from "@/lib/constants";
import { FormField, inputBaseClass, primaryButtonClass } from "@/components/ui/form-field";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { CustomLocationField, EMPTY_LEG, type LegValue } from "@/components/location/place-picker";

function dateToDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultMeetAt(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return dateToDatetimeLocalValue(date);
}

export function NewGatheringForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GatheringCategoryValue>(GATHERING_CATEGORIES[0].value);
  const [capacity, setCapacity] = useState("6");
  const [meetAt, setMeetAt] = useState(defaultMeetAt());
  const [place, setPlace] = useState<LegValue>(EMPTY_LEG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capacityNumber = Number(capacity) || 0;
  const isFormValid =
    title.trim().length >= 2 &&
    description.trim().length >= 5 &&
    place.label.trim().length >= 1 &&
    capacityNumber >= MIN_GATHERING_CAPACITY &&
    capacityNumber <= MAX_GATHERING_CAPACITY;

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/gatherings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        capacity: capacityNumber,
        meetAt: new Date(meetAt).toISOString(),
        placeLabel: place.label,
        placeLat: place.lat,
        placeLng: place.lng,
      }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "모임 등록에 실패했어요.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/gatherings/${body.gathering.id}`);
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <FormField label="제목">
        <input
          className={inputBaseClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 토익 스터디 모집, 주말 풋살 용병 구함"
          maxLength={60}
        />
      </FormField>

      <FormField label="설명">
        <textarea
          className="h-28 rounded-xl border border-gray-200 p-3 text-base outline-none focus:border-[#3B5BFD] focus:ring-2 focus:ring-[#3B5BFD]/20"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="모임 소개와 진행 방식을 적어 주세요."
          maxLength={1000}
        />
      </FormField>

      <FormField label="카테고리">
        <div className="flex flex-wrap gap-1.5">
          {GATHERING_CATEGORIES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setCategory(item.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                category === item.value ? "border-[#3B5BFD] bg-[#3B5BFD] text-white" : "border-gray-200 text-gray-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="정원(본인 포함)">
        <input
          type="number"
          className={inputBaseClass}
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          min={MIN_GATHERING_CAPACITY}
          max={MAX_GATHERING_CAPACITY}
        />
      </FormField>

      <FormField label="모일 시각">
        <DateTimePicker value={meetAt} onChange={setMeetAt} />
      </FormField>

      <CustomLocationField fieldLabel="장소" value={place} onChange={setPlace} />

      {error && <p className="text-xs text-[#F04452]">{error}</p>}

      <button type="button" className={primaryButtonClass} onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
        {isSubmitting ? "등록 중..." : "모임 만들기"}
      </button>
    </div>
  );
}
