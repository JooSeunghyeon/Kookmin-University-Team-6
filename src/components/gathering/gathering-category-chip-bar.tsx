import Link from "next/link";
import { GATHERING_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function GatheringCategoryChipBar({ activeCategory }: { activeCategory?: string }) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto px-5 pb-1">
      <Link
        href="/gatherings"
        className={cn(
          "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
          !activeCategory ? "border-[#3B5BFD] bg-[#3B5BFD] text-white" : "border-gray-200 bg-white text-gray-600",
        )}
      >
        전체
      </Link>
      {GATHERING_CATEGORIES.map((category) => (
        <Link
          key={category.value}
          href={`/gatherings?category=${category.value}`}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
            activeCategory === category.value
              ? "border-[#3B5BFD] bg-[#3B5BFD] text-white"
              : "border-gray-200 bg-white text-gray-600",
          )}
        >
          {category.label}
        </Link>
      ))}
    </div>
  );
}
