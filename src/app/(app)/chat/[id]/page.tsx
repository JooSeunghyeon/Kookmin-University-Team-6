import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { ChatThread } from "@/components/chat/chat-thread";
import type { ChatMessage, ChatRoom, Errand, PublicProfile } from "@/lib/supabase/types";

export default async function ChatRoomPage({ params }: PageProps<"/chat/[id]">) {
  const { id } = await params;
  const { profile } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: room } = await supabase.from("chat_rooms").select("*").eq("id", id).single<ChatRoom>();
  if (!room || (room.requester_id !== profile.id && room.partner_id !== profile.id)) {
    notFound();
  }

  const partnerId = room.requester_id === profile.id ? room.partner_id : room.requester_id;

  const [{ data: partner }, { data: errand }, { data: messages }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", partnerId).single<PublicProfile>(),
    supabase.from("errands").select("id, title").eq("id", room.errand_id).single<Pick<Errand, "id" | "title">>(),
    supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: true })
      .returns<ChatMessage[]>(),
  ]);

  return (
    <ChatThread
      roomId={id}
      currentUserId={profile.id}
      partnerNickname={partner?.nickname ?? "알 수 없음"}
      errandTitle={errand?.title ?? "의뢰"}
      initialMessages={messages ?? []}
    />
  );
}
