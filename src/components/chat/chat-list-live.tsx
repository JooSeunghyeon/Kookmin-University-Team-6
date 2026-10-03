"use client";

import { useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 채팅 목록(서버 컴포넌트)은 마지막 메시지·안 읽은 수를 최초 렌더 시점 값으로만 보여준다.
 * 이 컴포넌트는 화면에 아무것도 그리지 않고, 내가 참여한 채팅방(chat_rooms)이 바뀔 때마다
 * router.refresh()로 서버 데이터를 다시 가져와 목록을 실시간처럼 갱신한다.
 */
export function ChatListLive({ userId }: { userId: string }) {
  const router = useRouter();
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();

    const requesterChannel = supabase
      .channel(`chat_rooms_requester_${userId}_${instanceId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `requester_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe();

    const partnerChannel = supabase
      .channel(`chat_rooms_partner_${userId}_${instanceId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `partner_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requesterChannel);
      supabase.removeChannel(partnerChannel);
    };
  }, [userId, instanceId, router]);

  return null;
}
