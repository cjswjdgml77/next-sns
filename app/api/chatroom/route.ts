import { getPusherInstance } from "@/app/utils/realtime/pusher-server";
import { auth } from "@/auth";
import { s3 } from "@/lib/s3";
import {
  chatImages,
  chatrooms,
  chats,
  db,
  users,
  usersToChatrooms,
} from "@/schema";
import { IUser } from "@/type/types";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { and, eq, ilike } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
const pusherServer = getPusherInstance();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json("Unauthorized", { status: 401 });
  const search = request.nextUrl.searchParams.get("search");
  try {
    if (search) {
      const chatrooms = await db
        .select()
        .from(usersToChatrooms)
        .where(
          and(
            eq(usersToChatrooms.userId, session.user?.id!),
            ilike(usersToChatrooms.name, `%${search}%`)
          )
        );

      return NextResponse.json(chatrooms);
    }
    return NextResponse.json("");
  } catch (e) {
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json("Unauthorized", { status: 401 });
  const body = await request.json();
  if (!body.userList) return NextResponse.json("Bad Request", { status: 400 });
  //   body.userList.add(session.user);
  const userList: IUser[] = body.userList;
  const chatroomId = crypto.randomUUID();

  const me = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user?.email!));

  userList.push(me[0]);
  console.log(userList);
  const chatroomData = { id: chatroomId };

  const userToChatroomData = userList.map((user: any, idx) => {
    // is Group chat
    if (userList.length > 2) {
      return {
        userId: user.id,
        chatroomId: chatroomId,
        isActive: user.id === session.user?.id,
        isGroup: true,
        name: `Group with ${userList.length - 1}`,
      };
    } else {
      // not a Group chat
      return {
        userId: user.id,
        chatroomId: chatroomId,
        isActive: user.id === session.user?.id,
        isGroup: false,
        name: userList[userList.length - 1 - idx].name?.slice(0, 14),
      };
    }
  });
  try {
    await db.transaction(async (tx) => {
      await tx.insert(chatrooms).values(chatroomData);

      await tx.insert(usersToChatrooms).values(userToChatroomData);
    });
    return NextResponse.json("success", { status: 201 });
  } catch (e) {
    console.log(e);
    return NextResponse.json(e, { status: 500 });
  }
}
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.roomId) return NextResponse.json("Bad Request", { status: 400 });

  try {
    if (body.unread) {
      await db
        .update(usersToChatrooms)
        .set({ unread: 0 })
        .where(eq(usersToChatrooms.id, body.roomId));
    }
    if (body.name) {
      await db
        .update(usersToChatrooms)
        .set({ name: body.name })
        .where(eq(usersToChatrooms.id, body.roomId));
    }
    return NextResponse.json("Ok");
  } catch (e) {
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}

const Bucket = process.env.AMPLIFY_BUCKET;

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json("Unauthorized", { status: 401 });

  const body = await request.json();
  if (!body.userToChatroomId)
    return NextResponse.json("Bad Request", { status: 400 });
  const userToChatroom = await db
    .select()
    .from(usersToChatrooms)
    .where(eq(usersToChatrooms.id, body.userToChatroomId));
  if (userToChatroom.length === 0)
    return NextResponse.json("Unexpected Error", { status: 500 });
  try {
    let messageInserResult;
    await db.transaction(async (tx) => {
      await tx
        .delete(usersToChatrooms)
        .where(eq(usersToChatrooms.id, body.userToChatroomId));
      const userToChatrooms = await tx
        .select()
        .from(usersToChatrooms)
        .where(eq(usersToChatrooms.chatroomId, userToChatroom[0].chatroomId));

      // Delete before the chatroom is activated
      let isActivte = true;
      for (let i = 0; i < userToChatrooms.length; i++) {
        if (!userToChatrooms[i].isActive) {
          isActivte = false;
          break;
        }
      }
      // Delete before the chatroom is activated
      if (!isActivte) {
        await tx
          .delete(usersToChatrooms)
          .where(eq(usersToChatrooms.chatroomId, userToChatroom[0].chatroomId));
        await tx
          .delete(chatrooms)
          .where(eq(chatrooms.id, userToChatroom[0].chatroomId));
      } else if (userToChatrooms.length === 0) {
        //When every user is left delete Images.
        const images = await tx
          .select({ Key: chatImages.key })
          .from(chatImages)
          .innerJoin(chats, eq(chats.id, chatImages.chatId))
          .where(eq(chats.chatroomId, userToChatroom[0].chatroomId));
        if (images.length > 0) {
          await s3.send(
            new DeleteObjectsCommand({
              Bucket: Bucket,
              Delete: {
                Objects: images,
              },
            })
          );
        }
        await tx
          .delete(chatrooms)
          .where(eq(chatrooms.id, userToChatroom[0].chatroomId));
        //Delete images
      } else {
        messageInserResult = (
          await tx
            .insert(chats)
            .values({
              chatroomId: userToChatroom[0].chatroomId,
              message: `${session.user?.name} has left the chat.`,
            })
            .returning()
        )[0];
      }
    });

    if (messageInserResult) {
      await pusherServer.trigger(userToChatroom[0].chatroomId, "send", {
        chat: messageInserResult,
        user: {
          email: session.user?.email,
        },
      });
    }
    return NextResponse.json("leave success");
  } catch (e) {
    return NextResponse.json("Unexpected Error", { status: 500 });
  }
}
