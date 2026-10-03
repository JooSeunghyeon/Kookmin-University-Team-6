import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { formatKoreanDateTime } from "@/lib/time";
import { ChatListLive } from "@/components/chat/chat-list-live";
import type { ChatRoom, Errand, PublicProfile } from "@/lib/supabase/types";

export default async function ChatListPage() {
  const { profile } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("*")
    .or(`requester_id.eq.${profile.id},partner_id.eq.${profile.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .returns<ChatRoom[]>();

  const roomList = rooms ?? [];
  const errandIds = Array.from(new Set(roomList.map((room) => room.errand_id)));
  const partnerIds = Array.from(
    new Set(roomList.map((room) => (room.requester_id === profile.id ? room.partner_id : room.requester_id))),
  );

  const [{ data: errands }, { data: partners }] = await Promise.all([
    errandIds.length > 0
      ? supabase.from("errands").select("id, title").in("id", errandIds).returns<Pick<Errand, "id" | "title">[]>()
      : Promise.resolve({ data: [] as Pick<Errand, "id" | "title">[] }),
    partnerIds.length > 0
      ? supabase.from("profiles").select("*").in("id", partnerIds).returns<PublicProfile[]>()
      : Promise.resolve({ data: [] as PublicProfile[] }),
  ]);

  const errandTitleById = new Map((errands ?? []).map((errand) => [errand.id, errand.title]));
  const partnerById = new Map((partners ?? []).map((partner) => [partner.id, partner]));

  return (
    <main className="flex flex-col gap-3 px-5 pt-6">
      <ChatListLive userId={profile.id} />
      <h1 className="text-xl font-bold text-gray-900">채팅</h1>

      {roomList.length === 0 && (
        <p className="mt-10 text-center text-sm text-gray-400">아직 채팅방이 없어요.</p>
      )}

      {roomList.map((room) => {
        const partnerId = room.requester_id === profile.id ? room.partner_id : room.requester_id;
        const partner = partnerById.get(partnerId);
        const unread = room.requester_id === profile.id ? room.requester_unread : room.partner_unread;

        return (
          <Link
            key={room.id}
            href={`/chat/${room.id}`}
            className="flex items-center justify-between rounded-2xl border border-gray-100 p-4"
          >
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-gray-900">{partner?.nickname ?? "알 수 없음"}</p>
              <p className="text-xs text-gray-400">{errandTitleById.get(room.errand_id) ?? "의뢰"}</p>
              {room.last_message && (
                <p className="mt-1 max-w-[220px] truncate text-sm text-gray-600">{room.last_message}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {room.last_message_at && (
                <span className="text-[11px] text-gray-400">{formatKoreanDateTime(room.last_message_at)}</span>
              )}
              {unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3B5BFD] px-1.5 text-[11px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </main>
  );
}
