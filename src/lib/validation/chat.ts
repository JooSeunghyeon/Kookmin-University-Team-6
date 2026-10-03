import { z } from "zod";

export const openChatRoomSchema = z.object({
  errandId: z.string().uuid(),
  // 의뢰자가 특정 지원자와 선택 전 채팅을 먼저 열 때만 보낸다.
  partnerId: z.string().uuid().optional(),
});

export const sendChatMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1, "메시지를 입력해 주세요.").max(500),
});
