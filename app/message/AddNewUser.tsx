import UsernameWithAvartar from "@/components/ui/UsernameWithAvartar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { users } from "@/schema";
import axios from "axios";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState, useTransition } from "react";
import { IChatroomWithUsers } from "./page";

type Props = {
  chatrooms: IChatroomWithUsers[];
};

const AddNewUser = ({ chatrooms }: Props) => {
  const [userList, setUserList] = useState<(typeof users.$inferSelect)[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<typeof userList>([]);
  const [open, setOpen] = useState(false);
  const [disable, setDisable] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  useEffect(() => {
    setUserList([]);
    setSelectedUsers([]);
  }, [open]);

  const searchUserHandler = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    if (errorMessage) setErrorMessage("");
    startTransition(async () => {
      const data = await axios.get<typeof userList>(
        "/api/users?name=" + e.target.value
      );
      let u = [];
      for (let i = 0; i < 20; i++) {
        u.push({ id: crypto.randomUUID(), name: "dasfdas 232" });
      }
      setUserList(data.data);
    });
  };

  const addUserHandler = (clickedUser: typeof users.$inferSelect) => {
    const existing = selectedUsers.filter((user) => user.id === clickedUser.id);
    if (existing.length > 0) return;

    setSelectedUsers([...selectedUsers, clickedUser]);
  };

  const excludeSelectedUserHandler = (
    clickedUser: typeof users.$inferSelect
  ) => {
    setSelectedUsers(
      selectedUsers.filter((user) => user.id !== clickedUser.id)
    );
  };

  const addFinalUserHandler = async () => {
    if (selectedUsers.length === 0) return;
    setDisable(true);
    // Check duplicate single chat
    if (selectedUsers.length === 1) {
      chatrooms.filter((chatroom) => {
        if (!chatroom.isGroup) {
          if (chatroom.users[0].email === selectedUsers[0].email) {
            setErrorMessage("you already have a chat with this user");
            setDisable(false);
            return;
          }
        }
      });
    }
    console.log("send api");
    try {
      const result = await axios.post("/api/chatroom", {
        userList: selectedUsers,
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      console.log(e);
    } finally {
      setDisable(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Plus className="cursor-pointer mr-3" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
        </DialogHeader>
        <form className="grid py-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Input
              id="name"
              placeholder="search name"
              className="col-span-3"
              disabled={disable}
              onChange={searchUserHandler}
            />
          </div>
          <span className="text-red-500 text-xs pl-2">{errorMessage}</span>
        </form>

        {/* Start Showing Search results */}
        <div
          className={`w-full max-h-[300px] overflow-auto space-y-2 py-2 px-2 ${
            userList.length > 0 && "border-[1px] rounded-md"
          }`}
        >
          {userList.map((user) => (
            <div key={user.id} className="flex justify-between items-center">
              <UsernameWithAvartar
                name={user.name || ""}
                image={user.image || ""}
              />
              <Button
                variant={"outline"}
                size={"sm"}
                onClick={() => addUserHandler(user)}
              >
                Add
              </Button>
            </div>
          ))}
        </div>
        {/* End Showing Search Results */}

        {/* Start Showing Selected Users*/}
        <div className="w-full flex flex-wrap gap-1">
          {selectedUsers.map((sUser) => (
            <div
              key={sUser.id}
              className="flex items-center gap-1 border-[1px] border-neutral-500 rounded-lg px-1"
            >
              <UsernameWithAvartar
                image={sUser.image}
                name={sUser.name![0].toUpperCase() || ""}
                imageSize="w-[1rem] h-[1rem]"
                className="text-sm"
              />
              <X
                size={"0.7rem"}
                className="hover:text-red-400 cursor-pointer"
                onClick={() => excludeSelectedUserHandler(sUser)}
              />
            </div>
          ))}
        </div>
        {/* End Showing Selected Users*/}

        <DialogFooter>
          <Button onClick={addFinalUserHandler} disabled={disable}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewUser;
