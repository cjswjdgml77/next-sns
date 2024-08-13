"use client";
import PageIndicator from "@/components/PageIndicator";
import { IChatroomWithUsers } from "./page";
import AddNewUser from "./AddNewUser";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { pusher } from "../utils/realtime/pusher-client";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { Session } from "next-auth";
import MultipleUserAvatar from "./MultipleUserAvatar";
import axios from "axios";
import { timeChangeToHoursAndMinutes } from "@/lib/functions";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
type Props = {
  chatrooms: IChatroomWithUsers[];
  selectedId: string | undefined;
  session: Session;
};

const ChatUsersLayout = ({ chatrooms, selectedId, session }: Props) => {
  return (
    <section
      className={`w-[0px] md:w-auto overflow-hidden ${
        !selectedId && "flex-auto md:flex-none md:basis-[300px]"
      }`}
    >
      <div className="flex justify-between items-center pr-3">
        <PageIndicator text={"Message"} />

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage src={session.user?.image!} />
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={async () => {
                await axios.post("/api/logout");
                await signOut();
              }}
            >
              <button>Signout</button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ChatroomList
        chatrooms={chatrooms}
        selectedId={selectedId}
        session={session}
      />
    </section>
  );
};

const ChatroomList = ({ chatrooms: rooms, selectedId, session }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [chatrooms, setChatrooms] = useState(rooms);
  useEffect(() => {
    setChatrooms(rooms);
  }, [rooms]);
  useEffect(() => {
    const channel = pusher.subscribe(session.user?.email!);
    channel.bind("createRoom", (data: any) => {
      router.refresh();
    });
    return () => {
      channel.unbind();
    };
  }, []);
  const onSearch = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      startTransition(async () => {
        if (e.target.value) {
          const lower = e.target.value.toLowerCase();
          const searchChatroom = chatrooms.filter((chatroom) =>
            chatroom.name.toLowerCase().includes(lower)
          );
          setChatrooms(searchChatroom);
        } else {
          setChatrooms(chatrooms);
        }
      });
    },
    [rooms]
  );

  return (
    <div className="w-full">
      <div className="flex flex-col items-end gap-3">
        <div className="w-full px-3">
          <Input
            placeholder="Search...."
            className=""
            onChange={(e) => onSearch(e)}
          />
        </div>
        <AddNewUser chatrooms={chatrooms} />
        <div className="w-full md:min-w-80 md:max-w-80">
          {chatrooms.length > 0 && (
            <>
              {chatrooms.map((chatroom) => (
                <Chatroom
                  key={chatroom.id}
                  chatroom={chatroom}
                  session={session}
                  selectedId={selectedId}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
type TChatroom = {
  chatroom: IChatroomWithUsers;
  session: Session | null;
  selectedId: string | undefined;
};
const Chatroom = ({ chatroom, session, selectedId }: TChatroom) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lastMessage, setLastMessage] = useState(chatroom.lastMessage);
  const [unread, setUnread] = useState(chatroom.unread);
  // const [activate, setActivate] = useState(chatroom.isActive);
  const pathname = usePathname();

  useEffect(() => {
    const channel = pusher.subscribe(`room-${chatroom.id}`);
    channel.bind("send", async (data: any) => {
      if (session?.user?.email !== data.user.email) {
        setLastMessage(data.chat.message || "...file");
        if (selectedId === chatroom.id) {
          await axios.patch("/api/chatroom", {
            roomId: chatroom.userToChatroomId,
            unread: true,
          });
        } else {
          setUnread((read) => read + 1);
        }
      }
    });
    return () => {
      channel.unbind();
    };
  }, [selectedId]);

  const hnm = timeChangeToHoursAndMinutes(chatroom.lastMessageTime!);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    console.log(chatroom.lastMessageTime?.toLocaleString());
    setIsClient(true);
  }, []);

  // if (!activate) return null;
  if (!chatroom.isActive) return null;
  return (
    <button
      className={`
      w-full
      flex items-center gap-2 
      hover:bg-[--hover] px-10 py-2
      rounded-md
      relative
      overflow-hidden
      ${selectedId === chatroom.id && "user-select"}
      `}
      key={chatroom.id}
      onClick={() => {
        if (selectedId === chatroom.id) return;
        const sp = new URLSearchParams(searchParams);
        sp.set("room", chatroom.id);
        sp.set("ownroom", chatroom.userToChatroomId);
        router.replace(pathname + "?" + sp);
        setUnread(0);
      }}
    >
      <MultipleUserAvatar users={chatroom.users} />

      <div className="flex flex-col flex-1 items-start">
        <div className="truncate text-left w-[100vw] max-w-32">
          {chatroom.name ? chatroom.name : "group"}
        </div>
        <div className="text-left text-neutral-500 font-light text-sm truncate max-w-full">
          {lastMessage}
        </div>
      </div>
      <div className="text-xs grid-rows-[repeat(2,1fr)] space-y-1">
        <div className="">{chatroom.lastMessageTime && isClient && hnm}</div>
        <div
          className={`
            rounded-full 
            ${unread !== 0 ? "text-white bg-[#936f06]" : "text-transparent"}
        `}
        >
          {unread}
        </div>
      </div>
    </button>
  );
};

export default ChatUsersLayout;
