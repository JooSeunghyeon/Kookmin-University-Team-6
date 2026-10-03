import { z } from "zod";

export const openChatRoomSchema = z.object({
  errandId: z.string().uuid(),
});

export const sendChatMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1, "메시지를 입력해 주세요.").max(500),
});
