import Link from "next/link";
import { cn } from "@/lib/utils";

export type HomeMode = "request" | "help";

interface ModeSwitchProps {
  mode: HomeMode;
}

/**
 * 홈 화면 최상단 세그먼트. "해주세요"는 내가 의뢰를 등록하는 쪽(요청자),
 * "해줄게요"는 다른 학생의 의뢰를 찾아 돕는 쪽(수행자) 관점으로 화면을 완전히 나눈다.
 */
export function ModeSwitch({ mode }: ModeSwitchProps) {
  return (
    <div className="mx-5 flex rounded-full bg-gray-100 p-1 text-sm font-semibold">
      <Link
        href="/?mode=request"
        className={cn(
          "flex-1 rounded-full py-2.5 text-center transition",
          mode === "request" ? "bg-white text-[#3B5BFD] shadow-sm" : "text-gray-500",
        )}
      >
        해주세요
      </Link>
      <Link
        href="/?mode=help"
        className={cn(
          "flex-1 rounded-full py-2.5 text-center transition",
          mode === "help" ? "bg-white text-[#3B5BFD] shadow-sm" : "text-gray-500",
        )}
      >
        해줄게요
      </Link>
    </div>
  );
}
