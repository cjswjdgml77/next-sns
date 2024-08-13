import { z } from "zod";

export const ChatroomNameShema = z.object({
  name: z.string().min(3).max(15).optional(),
});
