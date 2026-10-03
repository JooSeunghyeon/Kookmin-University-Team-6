"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ERRAND_CATEGORIES, URGENT_LEVEL_FEE, MIN_ERRAND_PRICE, type ErrandCategory } from "@/lib/constants";
import { formatPoints } from "@/lib/utils";
import { FormField, inputBaseClass, primaryButtonClass } from "@/components/ui/form-field";
import type { CampusPlace } from "@/lib/supabase/types";
import type { AiAssistResult } from "@/lib/ai/assist";
import { PaymentConfirmModal } from "./payment-confirm-modal";

interface NewErrandFormProps {
  places: CampusPlace[];
  pointBalance: number;
}

function dateToDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultDesiredAt(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return dateToDatetimeLocalValue(date);
}

export function NewErrandForm({ places, pointBalance }: NewErrandFormProps) {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiApplied, setAiApplied] = useState<AiAssistResult | null>(null);

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

  async function handleAiAssist() {
    if (rawInput.trim().length < 2) {
      setAiError("내용을 2자 이상 입력해 주세요.");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput }),
      });
      const responseBody = await response.json();

      if (!response.ok) {
        setAiError(responseBody.error ?? "AI 정리에 실패했어요.");
        return;
      }

      const result = responseBody.result as AiAssistResult;
      setTitle(result.title);
      setBody(result.body);
      setCategory(result.category);
      setDesiredAt(dateToDatetimeLocalValue(new Date(result.desiredAt)));
      setPrice(String(result.suggestedPrice));

      const matchedFrom = places.find((place) => place.name === result.fromLabel);
      const matchedTo = places.find((place) => place.name === result.toLabel);
      if (matchedFrom) setFromPlaceId(matchedFrom.id);
      if (matchedTo) setToPlaceId(matchedTo.id);

      setAiApplied(result);
    } catch {
      setAiError("AI 정리에 실패했어요. 직접 입력해 주세요.");
    } finally {
      setIsAiLoading(false);
    }
  }

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
        rawInput: rawInput.trim() || undefined,
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
        aiSuggestedPrice: aiApplied?.suggestedPrice,
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
      <FormField label="어떤 심부름인가요? (자유롭게 적으면 AI가 정리해 드려요)">
        <textarea
          className="h-20 rounded-xl border border-gray-200 p-3 text-base outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20"
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder="예: 지금 공학관에서 정문까지 과제 출력물 좀 가져다주실 분"
          maxLength={1000}
        />
      </FormField>
      <button
        type="button"
        onClick={handleAiAssist}
        disabled={isAiLoading}
        className="btn-h w-full rounded-xl bg-[#8B5CF6] text-base font-semibold text-white transition disabled:opacity-40"
      >
        {isAiLoading ? "AI가 정리하는 중..." : "✦ AI로 정리하기"}
      </button>
      {aiError && <p className="text-xs text-[#F04452]">{aiError}</p>}
      {aiApplied && (
        <div className="rounded-xl bg-[#8B5CF6]/10 px-4 py-3 text-xs text-[#8B5CF6]">
          <p className="mb-1 font-semibold">✦ AI 추천 결과를 적용했어요</p>
          <p>{aiApplied.reasoning}</p>
          <p>
            추천 범위 {formatPoints(aiApplied.priceRangeMin)} ~ {formatPoints(aiApplied.priceRangeMax)}
          </p>
          {aiApplied.urgentRecommended && <p className="mt-1 font-semibold text-[#F04452]">⚡ 긴급 옵션을 추천해요</p>}
        </div>
      )}

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
