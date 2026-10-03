"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, Wifi } from "lucide-react";
import {
  ERRAND_CATEGORIES,
  URGENT_LEVEL_FEE,
  MIN_ERRAND_PRICE,
  MAX_ERRAND_PRICE,
  PLATFORM_FEE_MAX,
  PLATFORM_FEE_RATE,
  LOCATION_TYPES,
  LOCATION_TYPE_LABEL,
  calculatePlatformFee,
  calculateRunnerPayout,
  minErrandPrice,
  type ErrandCategory,
  type LocationType,
} from "@/lib/constants";
import { formatPoints } from "@/lib/utils";
import { FormField, inputBaseClass, primaryButtonClass } from "@/components/ui/form-field";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { CampusPlaceField, CustomLocationField, EMPTY_LEG, type LegValue } from "@/components/map/place-picker";
import type { CampusPlace } from "@/lib/supabase/types";
import type { AiAssistResult } from "@/lib/ai/assist";
import type { LatLng } from "@/lib/geo";
import { PaymentConfirmModal } from "./payment-confirm-modal";

interface NewErrandFormProps {
  places: CampusPlace[];
  pointBalance: number;
  schoolCenter: LatLng;
}

const ONLINE_LEG: LegValue = { placeId: null, label: "온라인", lat: null, lng: null };

function dateToDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultDesiredAt(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return dateToDatetimeLocalValue(date);
}

export function NewErrandForm({ places, pointBalance, schoolCenter }: NewErrandFormProps) {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiApplied, setAiApplied] = useState<AiAssistResult | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ErrandCategory>(ERRAND_CATEGORIES[0].value);
  const [locationType, setLocationType] = useState<LocationType>("campus");
  const [fromLeg, setFromLeg] = useState<LegValue>(EMPTY_LEG);
  const [toLeg, setToLeg] = useState<LegValue>(EMPTY_LEG);
  const [desiredAt, setDesiredAt] = useState(defaultDesiredAt());
  const [price, setPrice] = useState(String(MIN_ERRAND_PRICE));
  const [urgentLevel, setUrgentLevel] = useState<0 | 1 | 2>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveFromLeg = locationType === "online" ? ONLINE_LEG : fromLeg;
  const effectiveToLeg = locationType === "online" ? ONLINE_LEG : toLeg;

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
      if (matchedFrom || matchedTo) setLocationType("campus");
      if (matchedFrom) {
        setFromLeg({ placeId: matchedFrom.id, label: matchedFrom.name, lat: matchedFrom.lat, lng: matchedFrom.lng });
      }
      if (matchedTo) {
        setToLeg({ placeId: matchedTo.id, label: matchedTo.name, lat: matchedTo.lat, lng: matchedTo.lng });
      }

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
  const minPrice = minErrandPrice(locationType);
  const platformFee = calculatePlatformFee(priceNumber);
  const runnerPayout = calculateRunnerPayout(priceNumber);

  const isFormValid =
    title.trim().length >= 2 &&
    body.trim().length >= 5 &&
    effectiveFromLeg.label.trim().length >= 1 &&
    effectiveToLeg.label.trim().length >= 1 &&
    priceNumber >= minPrice &&
    priceNumber <= MAX_ERRAND_PRICE &&
    totalCost <= pointBalance;

  async function handleConfirmSubmit() {
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
        locationType,
        fromPlaceId: effectiveFromLeg.placeId,
        fromLat: effectiveFromLeg.lat,
        fromLng: effectiveFromLeg.lng,
        fromLabel: effectiveFromLeg.label,
        toPlaceId: effectiveToLeg.placeId,
        toLat: effectiveToLeg.lat,
        toLng: effectiveToLeg.lng,
        toLabel: effectiveToLeg.label,
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
        className="btn-h flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] text-base font-semibold text-white transition disabled:opacity-40"
      >
        <Sparkles size={18} />
        {isAiLoading ? "AI가 정리하는 중..." : "AI로 정리하기"}
      </button>
      {aiError && <p className="text-xs text-[#F04452]">{aiError}</p>}
      {aiApplied && (
        <div className="rounded-xl bg-[#8B5CF6]/10 px-4 py-3 text-xs text-[#8B5CF6]">
          <p className="mb-1 flex items-center gap-1 font-semibold">
            <Sparkles size={14} />
            AI 추천 결과를 적용했어요
          </p>
          <p>{aiApplied.reasoning}</p>
          <p>
            추천 범위 {formatPoints(aiApplied.priceRangeMin)} ~ {formatPoints(aiApplied.priceRangeMax)}
          </p>
          {aiApplied.urgentRecommended && (
            <p className="mt-1 flex items-center gap-1 font-semibold text-[#F04452]">
              <Zap size={14} />
              긴급 옵션을 추천해요
            </p>
          )}
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

      <FormField label="위치 방식">
        <div className="flex gap-1.5">
          {LOCATION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setLocationType(type)}
              className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                locationType === type
                  ? "border-[#3B5BFD] bg-[#3B5BFD] text-white"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              {LOCATION_TYPE_LABEL[type]}
            </button>
          ))}
        </div>
      </FormField>

      {locationType === "campus" && (
        <div className="grid grid-cols-2 gap-3">
          <CampusPlaceField fieldLabel="출발지" places={places} value={fromLeg} onSelect={setFromLeg} />
          <CampusPlaceField fieldLabel="도착지" places={places} value={toLeg} onSelect={setToLeg} />
        </div>
      )}

      {locationType === "custom" && (
        <div className="flex flex-col gap-3">
          <CustomLocationField fieldLabel="출발지" schoolCenter={schoolCenter} value={fromLeg} onChange={setFromLeg} />
          <CustomLocationField fieldLabel="도착지" schoolCenter={schoolCenter} value={toLeg} onChange={setToLeg} />
        </div>
      )}

      {locationType === "online" && (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-4 text-center">
          <Wifi size={22} className="text-gray-400" />
          <p className="text-xs text-gray-500">직접 만나지 않는 비대면 의뢰예요. 위치를 입력하지 않아도 돼요.</p>
        </div>
      )}

      <FormField label="희망 시각">
        <DateTimePicker value={desiredAt} onChange={setDesiredAt} />
      </FormField>

      <FormField label="사례금 (P)">
        <input
          type="number"
          className={inputBaseClass}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          min={minPrice}
          max={MAX_ERRAND_PRICE}
          step={100}
        />
        <span className="text-xs text-gray-400">
          한도 {formatPoints(minPrice)} ~ {formatPoints(MAX_ERRAND_PRICE)}
          {locationType === "online" && " · 온라인 의뢰는 최소 금액이 낮아요"} · 보유 {formatPoints(pointBalance)}
        </span>
        {priceNumber > 0 && priceNumber < minPrice && (
          <span className="text-xs text-[#F04452]">{formatPoints(minPrice)} 이상으로 입력해 주세요.</span>
        )}
        {priceNumber > MAX_ERRAND_PRICE && (
          <span className="text-xs text-[#F04452]">{formatPoints(MAX_ERRAND_PRICE)} 이하로 입력해 주세요.</span>
        )}
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

      <div className="flex flex-col gap-1.5 rounded-xl bg-gray-50 px-4 py-3 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>사례금</span>
          <span>{formatPoints(priceNumber)}</span>
        </div>
        {urgentFee > 0 && (
          <div className="flex justify-between text-[#F04452]">
            <span>긴급 옵션</span>
            <span>+{formatPoints(urgentFee)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold text-gray-900">
          <span>총 결제 금액</span>
          <span className="text-[#3B5BFD]">{formatPoints(totalCost)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-dashed border-gray-200 pt-1.5 text-gray-500">
          <span>수행자 수령액</span>
          <span className="font-semibold text-gray-700">{formatPoints(runnerPayout)}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>
            플랫폼 수수료 {Math.round(PLATFORM_FEE_RATE * 100)}%
            {platformFee >= PLATFORM_FEE_MAX && ` (상한 ${formatPoints(PLATFORM_FEE_MAX)})`}
          </span>
          <span>-{formatPoints(platformFee)}</span>
        </div>
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

      {showConfirm && (
        <PaymentConfirmModal
          title={title}
          price={priceNumber}
          urgentFee={urgentFee}
          totalCost={totalCost}
          fromLabel={effectiveFromLeg.label}
          toLabel={effectiveToLeg.label}
          isSubmitting={isSubmitting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  );
}
