"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Plus, User, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/nav/notification-bell";
import { Logo } from "@/components/ui/logo";

interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const TABS: TabItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/map", label: "지도", icon: Map },
  { href: "/gatherings", label: "모임", icon: Users },
  { href: "/me", label: "MY", icon: User },
];

/**
 * "/me"와 "/me/activity"처럼 한 탭의 href가 다른 탭의 href를 접두사로 포함하는 경우,
 * 단순 startsWith 매칭은 두 탭을 동시에 활성화시킨다. 매칭되는 href 중 "가장 구체적인(긴)"
 * href를 가진 탭 하나만 활성화하도록 전체 탭 목록을 기준으로 승자를 고른다.
 */
function findActiveHref(pathname: string, hrefs: string[]): string | null {
  let winner: string | null = null;
  for (const href of hrefs) {
    const matches = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (winner === null || href.length > winner.length)) {
      winner = href;
    }
  }
  return winner;
}

/** 모임 탭에 있을 때는 FAB이 "모임 만들기"로, 그 외에는 "의뢰 작성"으로 바뀐다. */
function fabHrefFor(pathname: string): string {
  return pathname.startsWith("/gatherings") ? "/gatherings/new" : "/errands/new";
}

export function BottomTabBar({ canWrite }: { canWrite: boolean }) {
  const pathname = usePathname();
  const activeHref = findActiveHref(
    pathname,
    TABS.map((tab) => tab.href),
  );

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur md:hidden">
      <div className="relative mx-auto grid grid-cols-5 items-center px-2 py-1.5">
        {TABS.slice(0, 2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={tab.href === activeHref} />
        ))}

        <Link
          href={canWrite ? fabHrefFor(pathname) : "#"}
          aria-disabled={!canWrite}
          className={cn(
            "-mt-7 flex h-14 w-14 items-center justify-center justify-self-center rounded-full text-white shadow-lg shadow-[#3B5BFD]/30 transition",
            canWrite ? "bg-[#3B5BFD]" : "pointer-events-none bg-gray-300",
          )}
        >
          <Plus size={26} strokeWidth={2.5} />
        </Link>

        {TABS.slice(2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={tab.href === activeHref} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: TabItem; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={cn(
        "flex min-h-12 flex-col items-center justify-center gap-0.5 justify-self-center text-[11px] font-medium",
        active ? "text-[#3B5BFD]" : "text-gray-400",
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 2} />
      {tab.label}
    </Link>
  );
}

export function SidebarNav({ canWrite, userId }: { canWrite: boolean; userId: string }) {
  const pathname = usePathname();
  const activeHref = findActiveHref(
    pathname,
    TABS.map((tab) => tab.href),
  );

  return (
    <nav className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-1 border-r border-gray-100 bg-white px-4 py-8 md:flex">
      <div className="mb-8 flex items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#3B5BFD]">
          <Logo size={28} />
          캠퍼스런
        </Link>
        <NotificationBell userId={userId} />
      </div>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              tab.href === activeHref ? "bg-[#3B5BFD]/10 text-[#3B5BFD]" : "text-gray-500 hover:bg-gray-50",
            )}
          >
            <Icon size={20} />
            {tab.label}
          </Link>
        );
      })}
      <Link
        href={canWrite ? fabHrefFor(pathname) : "#"}
        aria-disabled={!canWrite}
        className={cn(
          "mt-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition",
          canWrite ? "bg-[#3B5BFD]" : "pointer-events-none bg-gray-300",
        )}
      >
        <Plus size={18} />
        {pathname.startsWith("/gatherings") ? "모임 만들기" : "의뢰 작성"}
      </Link>
    </nav>
  );
}
