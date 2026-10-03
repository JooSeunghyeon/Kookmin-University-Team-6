"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatKoreanDateTime } from "@/lib/time";
import type { ChatMessage } from "@/lib/supabase/types";

interface ChatThreadProps {
  roomId: string;
  currentUserId: string;
  partnerNickname: string;
  errandTitle: string;
  initialMessages: ChatMessage[];
}

export function ChatThread({ roomId, currentUserId, partnerNickname, errandTitle, initialMessages }: ChatThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // 같은 roomId로 채널을 두 번 구독하면(예: 빠른 재마운트) realtime-js가 캐시된 채널에
  // on()을 호출해 에러가 나므로, 마운트마다 고유한 채널 이름을 사용한다.
  const instanceId = useId();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch(`/api/chat/rooms/${roomId}/read`, { method: "POST" }).then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat_room_${roomId}_${instanceId}`)
      .on<ChatMessage>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((current) =>
            current.some((message) => message.id === payload.new.id) ? current : [...current, payload.new],
          );
          if (payload.new.sender_id !== currentUserId) {
            fetch(`/api/chat/rooms/${roomId}/read`, { method: "POST" });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId, instanceId]);

  // Realtime 소켓이 끊기거나(네트워크 전환, 탭 백그라운드 등) 구독이 실패해도 메시지가
  // 보이도록 짧은 간격으로 폴링해 어긋난 상태를 보정하는 안전망. 새 메시지가 없으면
  // 배열을 교체하지 않아 불필요한 리렌더를 피한다.
  useEffect(() => {
    const supabase = createClient();
    const intervalId = setInterval(async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .returns<ChatMessage[]>();
      if (!data) return;
      setMessages((current) => {
        const hasNewMessage = data.length !== current.length;
        return hasNewMessage ? data : current;
      });
    }, 4000);

    return () => clearInterval(intervalId);
  }, [roomId]);

  async function handleSend() {
    const content = input.trim();
    if (content.length === 0) return;

    setIsSending(true);
    setError(null);
    setInput("");

    const response = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, content }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "메시지를 보낼 수 없어요.");
      setInput(content);
    }
    setIsSending(false);
  }

  return (
    <main className="flex flex-col gap-3 px-5 pt-6">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-lg font-bold text-gray-900">{partnerNickname}</h1>
        <p className="text-xs text-gray-400">{errandTitle}</p>
      </header>

      <div className="flex h-[58vh] flex-col gap-2 overflow-y-auto rounded-2xl bg-gray-50 p-3">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} isMine={message.sender_id === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-xs text-[#F04452]">{error}</p>}

      <div className="flex gap-2">
        <input
          className="h-11 flex-1 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#3B5BFD]"
          placeholder="메시지를 입력하세요"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSend();
          }}
          maxLength={500}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || input.trim().length === 0}
          className="h-11 rounded-xl bg-[#3B5BFD] px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          전송
        </button>
      </div>
    </main>
  );
}

function ChatBubble({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  if (message.type === "system") {
    return (
      <div className="self-center rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-500">{message.content}</div>
    );
  }

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
          isMine ? "bg-[#3B5BFD] text-white" : "border border-gray-200 bg-white text-gray-800"
        }`}
      >
        {message.content}
        {message.is_masked && (
          <span className={`ml-1 text-[10px] ${isMine ? "text-white/70" : "text-gray-400"}`}>(일부 가림)</span>
        )}
      </div>
      <span className="mt-0.5 text-[10px] text-gray-400">{formatKoreanDateTime(message.created_at)}</span>
    </div>
  );
}
