import { formatPoints } from "@/lib/utils";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";

interface PaymentConfirmModalProps {
  title: string;
  price: number;
  urgentFee: number;
  totalCost: number;
  fromLabel: string;
  toLabel: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PaymentConfirmModal({
  title,
  price,
  urgentFee,
  totalCost,
  fromLabel,
  toLabel,
  isSubmitting,
  onCancel,
  onConfirm,
}: PaymentConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">결제 확인</h2>
        <p className="mt-1 text-sm text-gray-500">{title}</p>
        <p className="mt-1 text-xs text-gray-400">{fromLabel} → {toLabel}</p>

        <div className="mt-4 flex flex-col gap-1.5 rounded-xl bg-gray-50 p-3 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>사례금</span>
            <span>{formatPoints(price)}</span>
          </div>
          {urgentFee > 0 && (
            <div className="flex justify-between text-[#F04452]">
              <span>긴급 옵션</span>
              <span>{formatPoints(urgentFee)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-gray-200 pt-1.5 font-bold text-gray-900">
            <span>총 결제 금액</span>
            <span>{formatPoints(totalCost)}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          결제한 포인트는 수행자가 선택될 때까지 보관되며, 완료 확인 후 지급돼요.
        </p>

        <div className="mt-4 flex gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onCancel} disabled={isSubmitting}>
            취소
          </button>
          <button type="button" className={primaryButtonClass} onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "등록 중..." : "결제하고 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
