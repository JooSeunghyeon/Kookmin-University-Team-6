import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  onRate?: (value: number) => void;
}

/** 읽기 전용(onRate 없음) 또는 입력용(onRate 있음)으로 모두 쓸 수 있는 별점 표시. */
export function StarRating({ rating, max = 5, size = 22, onRate }: StarRatingProps) {
  return (
    <div className="flex gap-1 text-amber-400">
      {Array.from({ length: max }, (_, index) => index + 1).map((value) =>
        onRate ? (
          <button key={value} type="button" onClick={() => onRate(value)} aria-label={`${value}점`}>
            <Star size={size} fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ) : (
          <Star key={value} size={size} fill={value <= rating ? "currentColor" : "none"} />
        ),
      )}
    </div>
  );
}
