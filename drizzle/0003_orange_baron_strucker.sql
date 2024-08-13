ALTER TABLE "userToChatroom" ADD COLUMN "unread" smallint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "chatroom" DROP COLUMN IF EXISTS "unread";