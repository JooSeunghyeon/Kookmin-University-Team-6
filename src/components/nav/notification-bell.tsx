"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/supabase/types";

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  // 데스크톱 사이드바와 모바일 상단바가 동시에 마운트되므로(CSS로만 숨김),
  // 같은 이름의 채널을 두 번 구독하면 realtime-js가 캐시된 채널에 on()을 호출해 에러가 난다.
  // 인스턴스마다 고유한 채널 이름을 써서 충돌을 피한다.
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();

    async function fetchUnreadCount() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      setUnreadCount(count ?? 0);
    }

    fetchUnreadCount();

    const channel = supabase
      .channel(`notifications_${userId}_${instanceId}`)
      .on<Notification>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setUnreadCount((current) => current + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, instanceId]);

  return (
    <Link href="/notifications" className="relative flex h-9 w-9 items-center justify-center text-xl" aria-label="알림">
      🔔
      {unreadCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F04452] px-1 text-[10px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
