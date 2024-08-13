import { Avatar, AvatarImage } from "@/components/ui/avatar";
import React from "react";
import UserLayoutCloseButton from "./UserLayoutCloseButton";
import { db, users } from "@/schema";
import { eq } from "drizzle-orm";

type Props = {
  selectedUser: string | undefined;
};

const UserLayout = async ({ selectedUser }: Props) => {
  if (!selectedUser) return null;
  const user = (
    await db.select().from(users).where(eq(users.id, selectedUser))
  )[0];

  return (
    <section
      className={`${selectedUser ? "block" : "hidden"} flex-1 lg:max-w-[300px]`}
    >
      <UserLayoutCloseButton />
      {/* Start User Profile */}
      <div className="flex flex-col items-center gap-1">
        <Avatar className="h-[3.8rem] w-[3.8rem]">
          <AvatarImage src={user.image || ""} />
        </Avatar>
        <div className="mt-1 max-w-28 text-center text-xl font-semibold">
          {user.name}
        </div>
        <div className="relative flex items-center gap-3">
          <div className="flex relative">
            <span className={`top-0 block w-3.5 h-3.5 ${user.isActive ? 'bg-green-500' : 'bg-gray-500'} border-2 border-white dark:border-gray-800 rounded-full`}></span>
            { user.isActive && <span className={`animate-ping absolute top-0 left-0 h-full w-full rounded-full bg-green-500  opacity-75`}></span>}
          </div>
          <div className="">
          {user.isActive ? 'Active' :'Away'}
          </div>
        </div>
      </div>
      {/* End User Profile */}
    </section>
  );
};

export default UserLayout;
