"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ERRAND_CATEGORIES, URGENT_LEVEL_FEE, MIN_ERRAND_PRICE, type ErrandCategory } from "@/lib/constants";
import { formatPoints } from "@/lib/utils";
import { FormField, inputBaseClass, primaryButtonClass } from "@/components/ui/form-field";
import type { CampusPlace } from "@/lib/supabase/types";
import { PaymentConfirmModal } from "./payment-confirm-modal";

interface NewErrandFormProps {
  places: CampusPlace[];
  pointBalance: number;
}

function defaultDesiredAt(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NewErrandForm({ places, pointBalance }: NewErrandFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ErrandCategory>(ERRAND_CATEGORIES[0].value);
  const [fromPlaceId, setFromPlaceId] = useState("");
  const [toPlaceId, setToPlaceId] = useState("");
  const [desiredAt, setDesiredAt] = useState(defaultDesiredAt());
  const [price, setPrice] = useState(String(MIN_ERRAND_PRICE));
  const [urgentLevel, setUrgentLevel] = useState<0 | 1 | 2>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromPlace = useMemo(() => places.find((place) => place.id === fromPlaceId), [places, fromPlaceId]);
  const toPlace = useMemo(() => places.find((place) => place.id === toPlaceId), [places, toPlaceId]);

  const priceNumber = Number(price) || 0;
  const urgentFee = urgentLevel === 0 ? 0 : URGENT_LEVEL_FEE[urgentLevel];
  const totalCost = priceNumber + urgentFee;

  const isFormValid =
    title.trim().length >= 2 &&
    body.trim().length >= 5 &&
    Boolean(fromPlace) &&
    Boolean(toPlace) &&
    priceNumber >= MIN_ERRAND_PRICE &&
    totalCost <= pointBalance;

  async function handleConfirmSubmit() {
    if (!fromPlace || !toPlace) return;

    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/errands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        category,
        fromPlaceId: fromPlace.id,
        fromLat: fromPlace.lat,
        fromLng: fromPlace.lng,
        fromLabel: fromPlace.name,
        toPlaceId: toPlace.id,
        toLat: toPlace.lat,
        toLng: toPlace.lng,
        toLabel: toPlace.name,
        desiredAt: new Date(desiredAt).toISOString(),
        price: priceNumber,
        urgentLevel,
      }),
    });
    const responseBody = await response.json();

    if (!response.ok) {
      setError(responseBody.error ?? "의뢰 등록에 실패했어요.");
      setIsSubmitting(false);
      setShowConfirm(false);
      return;
    }

    router.push(`/errands/${responseBody.errand.id}`);
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <FormField label="제목">
        <input
          className={inputBaseClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 학생회관 학식 포장해주실 분"
          maxLength={60}
        />
      </FormField>

      <FormField label="자세한 내용">
        <textarea
          className="h-28 rounded-xl border border-gray-200 p-3 text-base outline-none focus:border-[#3B5BFD] focus:ring-2 focus:ring-[#3B5BFD]/20"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="상황을 자유롭게 적어 주세요."
          maxLength={1000}
        />
      </FormField>

      <FormField label="카테고리">
        <div className="flex flex-wrap gap-1.5">
          {ERRAND_CATEGORIES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setCategory(item.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                category === item.value
                  ? "border-[#3B5BFD] bg-[#3B5BFD] text-white"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="출발지">
          <select
            className={inputBaseClass}
            value={fromPlaceId}
            onChange={(event) => setFromPlaceId(event.target.value)}
          >
            <option value="">선택해 주세요</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="도착지">
          <select
            className={inputBaseClass}
            value={toPlaceId}
            onChange={(event) => setToPlaceId(event.target.value)}
          >
            <option value="">선택해 주세요</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="희망 시각">
        <input
          type="datetime-local"
          className={inputBaseClass}
          value={desiredAt}
          onChange={(event) => setDesiredAt(event.target.value)}
        />
      </FormField>

      <FormField label="사례금 (P)">
        <input
          type="number"
          className={inputBaseClass}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          min={MIN_ERRAND_PRICE}
          step={100}
        />
      </FormField>

      <FormField label="긴급 옵션">
        <div className="flex gap-1.5">
          {([0, 1, 2] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setUrgentLevel(level)}
              className={`flex-1 rounded-xl border py-2 text-sm font-semibold ${
                urgentLevel === level
                  ? "border-[#F04452] bg-[#F04452]/10 text-[#F04452]"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              {level === 0 ? "일반" : level === 1 ? `긴급 +${URGENT_LEVEL_FEE[1]}P` : `긴급 플러스 +${URGENT_LEVEL_FEE[2]}P`}
            </button>
          ))}
        </div>
      </FormField>

      {error && <p className="text-xs text-[#F04452]">{error}</p>}

      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
        <span className="text-gray-500">총 결제 금액</span>
        <span className="font-bold text-[#3B5BFD]">{formatPoints(totalCost)}</span>
      </div>
      {totalCost > pointBalance && (
        <p className="text-xs text-[#F04452]">보유 포인트({formatPoints(pointBalance)})가 부족해요.</p>
      )}

      <button
        type="button"
        className={primaryButtonClass}
        onClick={() => setShowConfirm(true)}
        disabled={!isFormValid}
      >
        다음
      </button>

      {showConfirm && fromPlace && toPlace && (
        <PaymentConfirmModal
          title={title}
          price={priceNumber}
          urgentFee={urgentFee}
          totalCost={totalCost}
          fromLabel={fromPlace.name}
          toLabel={toPlace.name}
          isSubmitting={isSubmitting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  );
}
