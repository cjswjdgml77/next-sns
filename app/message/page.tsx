import React from "react";
import UserLayout from "./UserLayout";
import { auth } from "@/auth";
import { chatrooms, db, users } from "@/schema";
import { InferSelectModel, sql } from "drizzle-orm";
import ChatUsersLayout from "./ChatUsersLayout";
import MessageLayout from "./MessageLayout";
import { redirect } from "next/navigation";

type Props = {
  searchParams: {
    room?: string;
    ownroom?: string;
    selectedUser?: string;
  };
};

interface IChatroom extends InferSelectModel<typeof chatrooms> {}
export interface IChatroomWithUsers extends IChatroom {
  users: InferSelectModel<typeof users>[];
  userToChatroomId: string;
  unread: number;
  createdAt: Date;
  name: string;
  isActive: boolean;
  isGroup: boolean;
}
const MessagePage = async ({ searchParams }: Props) => {
  const session = await auth();
  if (!session) redirect("/auth/login");
  const chatroom = (await db.execute(sql`
  select 
    new1."id", new1."lastMessage",new1."unread",
    new1."unread",new1."isActive", new1."isGroup",
    new1."userToChatroomId", new1."name",
    new1."lastMessageTime", new1."charoomCreatedAt" as "createdAt", new2."users"
  from(
    select 
      c.* ,d."id" as "userToChatroomId", d."unread",
      d."createdAt" as "charoomCreatedAt", d."name", d."isActive", d."isGroup"
    from public."userToChatroom" d 
    left join public."chatroom" as "c" on c."id" = d."chatroomId" 
    where "userId"=${session.user!.id}
    ) new1 left join (
    select * from (
      select 
        uc."chatroomId", json_agg(u.*) as "users"
      from public."userToChatroom" uc 
      left join public."user" u on u."id" = uc."userId"  where u."id" != ${
        session?.user?.id
      }
      group by uc."chatroomId") d left join public."chatroom" as "c" on  c."id" = d."chatroomId"
    ) new2 on new1."id"= new2."chatroomId" order by new1."charoomCreatedAt" asc ;
    
  `)) as unknown as IChatroomWithUsers[];

  let selectedRoom;
  if (searchParams.room && searchParams.ownroom) {
    selectedRoom = chatroom.filter((room) => room.id === searchParams.room)[0];
    // await db.select().from(usersToChatrooms).where(and(eq(usersToChatrooms.userId, session.user?.id!),eq(usersToChatrooms.chatroomId,)))
    await db.execute(sql`
      update public."userToChatroom" set unread = 0  WHERE "id" = ${selectedRoom.userToChatroomId}
    `);
  }
  return (
    <section className="flex border-l-[1px]">
      <ChatUsersLayout
        chatrooms={chatroom}
        selectedId={selectedRoom?.id}
        session={session}
      />
      <MessageLayout
        selectedRoom={selectedRoom}
        selectedUser={searchParams.selectedUser}
      />
      <UserLayout selectedUser={searchParams.selectedUser} />
    </section>
  );
};

export default MessagePage;
