import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="text-xs text-[#F04452]">{error}</span>}
    </label>
  );
}

export const inputBaseClass =
  "h-12 rounded-xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-[#3B5BFD] focus:ring-2 focus:ring-[#3B5BFD]/20";

export const primaryButtonClass =
  "btn-h w-full rounded-xl bg-[#3B5BFD] text-base font-semibold text-white transition disabled:opacity-40";

export const secondaryButtonClass =
  "btn-h w-full rounded-xl border border-gray-200 bg-white text-base font-semibold text-gray-700 transition";
