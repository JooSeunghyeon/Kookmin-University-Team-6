"use client";

import { useId } from "react";
import { Calendar } from "lucide-react";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
}

/**
 * 네이티브 datetime-local input을 그대로 쓰되, 브라우저마다 다르게 보이던 기본 달력 아이콘을
 * 투명 처리하고 동일한 위치에 lucide Calendar 아이콘을 겹쳐 깨져 보이는 문제를 없앤다.
 */
export function DateTimePicker({ value, onChange, min }: DateTimePickerProps) {
  const inputId = useId();
  return (
    <div className="relative">
      <input
        id={inputId}
        type="datetime-local"
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-11 text-base outline-none focus:border-[#3B5BFD] focus:ring-2 focus:ring-[#3B5BFD]/20 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:h-8 [&::-webkit-calendar-picker-indicator]:w-8 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
      <Calendar size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
