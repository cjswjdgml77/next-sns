import { getPusherInstance } from "@/app/utils/realtime/pusher-server";
import { auth } from "@/auth";
import { chats, db, users, usersToChatrooms } from "@/schema";

import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
const pusherServer = getPusherInstance();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const session = await auth();
  if (!session) return NextResponse.json("Unauthorized", { status: 401 });
  if (!body.chatroomId || !body.message) {
    return NextResponse.json("Bad Request", { status: 400 });
  }
  try {
    let messageInserResult;

    let chatroomUsers: any[] = [];
    await db.transaction(async (tx) => {
      //Update Last Message
      await tx.execute(sql`
        update public."chatroom"
          set "lastMessage"=${body.message.slice(
            0,
            19
          )}, "lastMessageTime"= NOW()
        where "id" = ${body.chatroomId}
      `);

      // Update Unread count for each rooom
      await tx.execute(sql`
      update public."userToChatroom" set "unread" = "unread" +1
      where "chatroomId" = ${body.chatroomId} and "userId" != ${session.user?.id};
      `);

      // Check if the message is first started then should active other chatroom opens
      if (body.isFirst) {
        const countOfChats = await tx
          .select()
          .from(chats)
          .where(eq(chats.chatroomId, body.chatroomId))
          .limit(1);

        if (countOfChats.length === 0) {
          await tx
            .update(usersToChatrooms)
            .set({ isActive: true })
            .where(eq(usersToChatrooms.chatroomId, body.chatroomId));
          chatroomUsers = await tx
            .select()
            .from(users)
            .leftJoin(usersToChatrooms, eq(users.id, usersToChatrooms.userId));
        }
      }

      // Insert new messages
      messageInserResult = (
        await tx
          .insert(chats)
          .values({
            message: body.message,
            chatroomId: body.chatroomId,
            sender: session.user!.email,
          })
          .returning()
      )[0];
    });

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user?.id!));

    await pusherServer.trigger(body.chatroomId, "send", {
      chat: messageInserResult,
      user: user[0],
    });

    //if it's first message
    if (chatroomUsers && chatroomUsers.length > 0) {
      // Update chatroom for activaion first massage.
      for (let i = 0; i < chatroomUsers.length; i++) {
        await pusherServer.trigger(
          chatroomUsers[i].user.email,
          "createRoom",
          chatroomUsers[i]
        );
      }
    } else {
      await pusherServer.trigger(`room-${body.chatroomId}`, "send", {
        chat: messageInserResult,
        user: user[0],
      });
    }

    return NextResponse.json("sccesss");
  } catch (e) {
    return NextResponse.json(e, { status: 500 });
  }
}
