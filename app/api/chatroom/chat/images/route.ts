import {
  S3Client,
  ListObjectsCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { chatImages, chats, db, users } from "@/schema";
import { auth } from "@/auth";
import { eq, sql } from "drizzle-orm";
import { getPusherInstance } from "@/app/utils/realtime/pusher-server";
import { s3 } from "@/lib/s3";

const pusherServer = getPusherInstance();
const Bucket = process.env.AMPLIFY_BUCKET;

export async function POST(request: NextRequest) {
  const session = await auth();
  const formData = await request.formData();
  const files = formData.getAll("file") as File[];
  const chatroomId = formData.get("chatroomId") as string;
  const imageDimension = JSON.parse(formData.get("imageDimension") as string);
  if (!session) return NextResponse.json("Unauthorized", { status: 401 });
  if (!chatroomId) return NextResponse.json("Bad Request", { status: 400 });
  try {
    const keyArr: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const Body = (await files[i].arrayBuffer()) as Buffer;
      const key = `${Date.now()}${files[i].name}`;
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: `${key}`,
          Body,
        })
      );
      keyArr.push(key);
    }
    let chatResult;
    let imagesResult: (typeof chatImages.$inferSelect)[] = [];

    // Add new empty chat to database
    const imageUrl = await db.transaction(async (tx) => {
      const chat = await tx
        .insert(chats)
        .values({ chatroomId: chatroomId, sender: session.user?.email })
        .returning();

      chatResult = chat[0];

      // Add Image url to database
      for (let i = 0; i < keyArr.length; i++) {
        const data = await tx
          .insert(chatImages)
          .values({
            key: keyArr[i],
            chatId: chat[0].id,
            width: Number(imageDimension[i].width),
            height: Number(imageDimension[i].height),
          })
          .returning();
        imagesResult.push(data[0]);
      }

      //Update Last Message
      await tx.execute(sql`
        update public."chatroom"
          set "lastMessage"='...files', "lastMessageTime"= NOW()
        where "id" = ${chatroomId}
      `);

      // Update Unread count for each rooom
      await tx.execute(sql`
      update public."userToChatroom" set "unread" = "unread" +1
      where "chatroomId" = ${chatroomId} and "userId" != ${session.user?.id};
      `);
    });
    if (chatResult) {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user?.id!));
      await pusherServer.trigger(`room-${chatroomId}`, "send", {
        chat: chatResult,
        user: user[0],
      });
      await pusherServer.trigger(chatroomId, "send", {
        user: user[0],
        chat: chatResult,
        images: imagesResult,
      });
    }

    return NextResponse.json("success");
  } catch (e) {
    console.log(e);
    return NextResponse.json(e, { status: 500 });
  }
}
