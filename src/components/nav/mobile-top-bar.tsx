import Link from "next/link";
import { NotificationBell } from "@/components/nav/notification-bell";
import { Logo } from "@/components/ui/logo";

export function MobileTopBar({ userId }: { userId: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-[#3B5BFD]">
        <Logo size={24} />
        캠퍼스런
      </Link>
      <NotificationBell userId={userId} />
    </header>
  );
}
