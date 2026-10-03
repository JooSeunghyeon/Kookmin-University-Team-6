"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/map", label: "지도", icon: "🗺️" },
  { href: "/me/activity", label: "내 활동", icon: "📋" },
  { href: "/me", label: "MY", icon: "👤" },
];

function isActiveTab(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function BottomTabBar({ canWrite }: { canWrite: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur md:hidden">
      <div className="relative mx-auto flex max-w-sm items-center justify-between px-6 py-2">
        {TABS.slice(0, 2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActiveTab(pathname, tab.href)} />
        ))}

        <Link
          href={canWrite ? "/errands/new" : "#"}
          aria-disabled={!canWrite}
          className={cn(
            "-mt-6 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg shadow-[#3B5BFD]/30 transition",
            canWrite ? "bg-[#3B5BFD]" : "pointer-events-none bg-gray-300",
          )}
        >
          ＋
        </Link>

        {TABS.slice(2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActiveTab(pathname, tab.href)} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: TabItem; active: boolean }) {
  return (
    <Link
      href={tab.href}
      className={cn(
        "flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium",
        active ? "text-[#3B5BFD]" : "text-gray-400",
      )}
    >
      <span className="text-lg leading-none">{tab.icon}</span>
      {tab.label}
    </Link>
  );
}

export function SidebarNav({ canWrite }: { canWrite: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-1 border-r border-gray-100 bg-white px-4 py-8 md:flex">
      <Link href="/" className="mb-8 px-2 text-xl font-bold text-[#3B5BFD]">
        캠퍼스런
      </Link>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            isActiveTab(pathname, tab.href)
              ? "bg-[#3B5BFD]/10 text-[#3B5BFD]"
              : "text-gray-500 hover:bg-gray-50",
          )}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          {tab.label}
        </Link>
      ))}
      <Link
        href={canWrite ? "/errands/new" : "#"}
        aria-disabled={!canWrite}
        className={cn(
          "mt-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition",
          canWrite ? "bg-[#3B5BFD]" : "pointer-events-none bg-gray-300",
        )}
      >
        ＋ 의뢰 작성
      </Link>
    </nav>
  );
}
