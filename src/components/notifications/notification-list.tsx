"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatKoreanDateTime } from "@/lib/time";
import type { Notification } from "@/lib/supabase/types";

interface NotificationListProps {
  initialNotifications: Notification[];
}

export function NotificationList({ initialNotifications }: NotificationListProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadIds = notifications.filter((notification) => !notification.is_read).map((notification) => notification.id);

  async function markAsRead(id: string) {
    setNotifications((current) =>
      current.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)),
    );
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllAsRead() {
    if (unreadIds.length === 0) return;
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  }

  if (notifications.length === 0) {
    return <p className="mt-10 text-center text-sm text-gray-400">아직 알림이 없어요.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {unreadIds.length > 0 && (
        <button type="button" onClick={markAllAsRead} className="self-end text-xs font-medium text-[#3B5BFD]">
          모두 읽음 처리
        </button>
      )}

      {notifications.map((notification) => {
        const content = (
          <div
            className={`flex flex-col gap-0.5 rounded-xl border p-3 ${
              notification.is_read ? "border-gray-100 bg-white" : "border-[#3B5BFD]/30 bg-[#3B5BFD]/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
              {!notification.is_read && <span className="h-2 w-2 rounded-full bg-[#3B5BFD]" />}
            </div>
            <p className="text-xs text-gray-600">{notification.body}</p>
            <p className="text-[11px] text-gray-400">{formatKoreanDateTime(notification.created_at)}</p>
          </div>
        );

        if (notification.link) {
          return (
            <Link key={notification.id} href={notification.link} onClick={() => markAsRead(notification.id)}>
              {content}
            </Link>
          );
        }

        return (
          <button key={notification.id} type="button" onClick={() => markAsRead(notification.id)} className="text-left">
            {content}
          </button>
        );
      })}
    </div>
  );
}
