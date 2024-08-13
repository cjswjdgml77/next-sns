ALTER TABLE "chatImage" ALTER COLUMN "chatId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chatImage" ADD COLUMN "key" varchar(255) NOT NULL;