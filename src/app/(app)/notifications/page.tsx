import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { NotificationList } from "@/components/notifications/notification-list";
import type { Notification } from "@/lib/supabase/types";

export default async function NotificationsPage() {
  const { profile } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Notification[]>();

  return (
    <main className="flex flex-col gap-3 px-5 pt-6">
      <h1 className="text-xl font-bold text-gray-900">알림</h1>
      <NotificationList initialNotifications={notifications ?? []} />
    </main>
  );
}
