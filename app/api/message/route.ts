import { auth } from "@/auth";
import { chatImages, chats, db, users } from "@/schema";
import { and, count, desc, eq, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  const chatroomId = request.nextUrl.searchParams.get("chatroomId");
  const sender = request.nextUrl.searchParams.get("sender");
  const createdAt = new Date(request.nextUrl.searchParams.get("createdAt")!);
  if (!chatroomId || !sender)
    return NextResponse.json("Bad Request", { status: 400 });

  try {
    const sq = db
      .select()
      .from(chats)
      .where(
        and(eq(chats.chatroomId, chatroomId), lt(chats.createdAt, createdAt))
      )
      .orderBy(desc(chats.createdAt))
      .limit(15)
      .as("chat");
    const messages = await db
      .select()
      .from(sq)
      .leftJoin(users, eq(users.email, sq.sender))
      .leftJoin(chatImages, eq(chatImages.chatId, sq.id))
      .orderBy(desc(sq.createdAt));
    if (messages.length === 0) return NextResponse.json([]);
    const reversed = messages.reverse();
    const isNext =
      (
        await db
          .select({ count: count() })
          .from(chats)
          .where(
            and(
              eq(chats.chatroomId, chatroomId),
              lt(chats.createdAt, reversed[0].chat.createdAt!)
            )
          )
      )[0].count > 0
        ? true
        : false;
    const newMessages = [];
    for (const value of reversed) {
      if (newMessages.length === 0) {
        if (value.chatImage) {
          newMessages.push({ ...value, images: [value.chatImage] });
        } else newMessages.push({ ...value, images: [] });
      } else {
        if (value.chatImage) {
          if (
            newMessages[newMessages.length - 1].images.length > 0 &&
            newMessages[newMessages.length - 1].chat.id === value.chat.id
          ) {
            newMessages[newMessages.length - 1].images.push(value.chatImage);
          } else {
            newMessages.push({ ...value, images: [value.chatImage] });
          }
        } else if (!value.chatImage) {
          newMessages.push({ ...value, images: [] });
        }
      }
    }
    return NextResponse.json({
      messages: newMessages,
      isNext: isNext,
    });
  } catch (e) {
    return NextResponse.json(e, { status: 500 });
  }
}
