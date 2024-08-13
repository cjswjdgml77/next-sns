"use client";

import { users, usersToChatrooms } from "@/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, EllipsisVertical, Paperclip, Send } from "lucide-react";
import axios from "axios";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  IMessageImages,
  IMessages,
  IMessagesWithIUsers,
  IUser,
} from "@/type/types";
import { IChatroomWithUsers } from "./page";
import { useSession } from "next-auth/react";
import { timeChangeToHoursAndMinutes } from "@/lib/functions";
import { pusher } from "../utils/realtime/pusher-client";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import MultipleUserAvatar from "./MultipleUserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Alert from "@/components/ui/Alert";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { filesize } from "filesize";
import { useToast } from "@/components/ui/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { ChatroomNameShema } from "@/lib/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

type Props = {
  selectedRoom: IChatroomWithUsers | undefined;
  selectedUser: string | undefined;
};

const MessageLayout = ({ selectedRoom, selectedUser }: Props) => {
  const router = useRouter();
  if (!selectedRoom)
    return (
      <section className="hidden md:flex flex-1 border-x-[1px] justify-center items-center">
        <div className="">click user to see</div>
      </section>
    );
  return (
    <section
      className={`
      flex-1 md:flex-1 border-x-[1px] relative
      flex flex-col
      h-screen
      ${selectedUser && "flex-none w-0 md:w-full overflow-hidden"}
      `}
    >
      <div
        className="
          md:hidden ml-1 mt-2 w-8 h-8 
          rounded-full hover:bg-neutral-200
          flex justify-center items-center cursor-pointer
          "
        onClick={() => {
          router.replace("/message");
          router.refresh();
        }}
      >
        <ChevronLeft strokeWidth={3} />
      </div>
      <TopUserSection
        users={selectedRoom.users}
        userToChatroomId={selectedRoom.userToChatroomId}
        name={selectedRoom.name}
      />

      <MessageSection chatroomId={selectedRoom.id} />
    </section>
  );
};

type TopUserProps = {
  users: (typeof users.$inferSelect)[];
  userToChatroomId: string;
  name: string;
};
const TopUserSection = ({ users, userToChatroomId, name }: TopUserProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openForChangeRoomName, setOpenForChangeRoomName] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const actionForLeave = async () => {
    try {
      await axios.delete("/api/chatroom", { data: { userToChatroomId } });
      router.replace("/message");
      router.refresh();
    } catch (e) {
      toast({
        description: "Something went wrong! Please try again.",
        variant: "destructive",
      });
    }
  };

  const form = useForm<z.infer<typeof ChatroomNameShema>>({
    resolver: zodResolver(ChatroomNameShema),
  });
  const onSubmit = async (data: z.infer<typeof ChatroomNameShema>) => {
    if (!data.name) return;
    try {
      setLoading(true);
      await axios.patch("/api/chatroom", {
        roomId: userToChatroomId,
        name: data.name,
      });
      router.refresh();
      setOpenForChangeRoomName(false);
    } catch (e) {
      toast({
        description: "Something went wrong! Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  console.log(name);
  return (
    <section className="flex pt-6 pb-4 px-3 items-center justify-between">
      <div className="flex items-center gap-2">
        <MultipleUserAvatar users={users} />
        <div>{name}</div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <EllipsisVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="origin-left">
          <DropdownMenuItem
            onClick={() => {
              setOpen(true);
            }}
          >
            Leave
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setOpenForChangeRoomName(true);
            }}
          >
            Change Chatroom Name
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {open && <Alert open={open} setOpen={setOpen} action={actionForLeave} />}
      <Dialog
        open={openForChangeRoomName}
        onOpenChange={setOpenForChangeRoomName}
      >
        <DialogContent className="max-w-72">
          <DialogHeader className="gap-2">
            <DialogTitle>Change Chatroom</DialogTitle>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-3"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          defaultValue={name}
                          placeholder="Enter your chatroom name ..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit">Change Name</Button>
              </form>
            </Form>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  );
};

const MessageSection = ({ chatroomId }: { chatroomId: string }) => {
  const session = useSession();
  const messageInputRef = useRef<HTMLInputElement>(null);
  const scrollDivRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<IMessagesWithIUsers[]>([]);
  const [next, setNext] = useState(false);
  const isMine = useRef(false);
  console.log(messages);
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const [isFirst, setIsFirst] = useState(true);

  const { toast } = useToast();

  /**
   * Keeps the current scroll position(when messages more added) using the prevScrollHeight
   */
  function keepScrollHeight() {
    if (!scrollDivRef.current) return;
    scrollDivRef.current.scrollTop =
      scrollDivRef.current.scrollHeight - prevScrollHeight;
    setPrevScrollHeight(scrollDivRef.current.scrollHeight);
  }

  /**
   * Move the scroll to bottom posiiton;
   */
  function scrollToBottom() {
    if (!scrollDivRef.current) return;
    scrollDivRef.current!.scrollTop = scrollDivRef.current!.scrollHeight;
  }

  // Listen to the Reatime message with room id
  useEffect(() => {
    const channel = pusher.subscribe(chatroomId);
    channel.bind("send", async (data: IMessagesWithIUsers) => {
      if (!data.images) {
        data.images = [];
      }
      if (data.user?.email === session.data?.user?.email) {
        isMine.current = true;
      }
      setMessages((messages) => [...messages, data]);
    });

    //Scroll Controller
    if (!scrollDivRef.current) return;
    if (isMine.current) {
      scrollToBottom();
      isMine.current = false;
    }
    // When scroll hit the top
    if (prevScrollHeight && scrollDivRef.current.scrollTop === 0) {
      keepScrollHeight();
    }

    // Only for First Rendering
    if (isFirst) {
      setIsFirst(false);
      setPrevScrollHeight(scrollDivRef.current.scrollHeight);
      scrollToBottom();
    }
    return () => {
      channel.unbind();
    };
  }, [messages]);

  useEffect(() => {
    getMessage(true);
  }, [chatroomId]);

  /**
   * Get Messages and Get Messages when the scroll is the top
   * @param first boolean
   * @returns
   */
  async function getMessage(first: boolean) {
    if (!next && !first) return;
    setPending(true);

    try {
      if (first) {
        const data = await axios.get(
          `/api/message?chatroomId=${chatroomId}&sender=${
            session.data?.user?.email
          }&createdAt=${new Date().toISOString()}`
        );
        setMessages(data.data.messages || []);
        setNext(data.data.isNext);
      } else {
        const date =
          messages.length > 0
            ? messages[0].chat?.createdAt
            : new Date().toISOString();
        const data = await axios.get(
          `/api/message?chatroomId=${chatroomId}&sender=${session.data?.user?.email}&createdAt=${date}`
        );
        if (data.data.length === 0) return;
        setMessages([...data.data.messages, ...messages]);
        setNext(data.data.isNext);
      }
    } catch (e) {
      toast({
        description: "Something went wrong! Please try again.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  // Send a more message if scroll hit
  const scrollHanler = async () => {
    if (pending || !scrollDivRef.current) return;
    if (scrollDivRef.current.scrollTop === 0) {
      await getMessage(false);
    }
  };

  // Sending a message
  const messageSandHandler = async () => {
    if (!messageInputRef.current) return;
    setPending(true);
    try {
      await axios.post("/api/chatroom/chat", {
        chatroomId,
        message: messageInputRef.current.value,
        isFirst: messages.length === 0,
      });

      messageInputRef.current.value = "";
    } catch (e) {
      toast({
        description: "Something went wrong! Please try again.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  if (!messages) return;

  return (
    <section
      className="
        flex-1 bg-white h-full overflow-hidden
        flex flex-col
        rounded-t-2xl
        border-t-[1px]
        "
    >
      <div
        className={`overflow-y-auto flex-1 py-4 px-6`}
        ref={scrollDivRef}
        onScroll={scrollHanler}
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-neutral-400">
            Start a conversation!
          </div>
        )}
        {messages.length > 0 &&
          messages.map((message) => {
            if (message.user?.email === session?.data?.user?.email!) {
              return (
                <MyMessage
                  chat={message.chat!}
                  images={message.images}
                  user={message.user}
                  key={message.chat!.id}
                />
              );
            } else
              return (
                <OtherMessage
                  chat={message.chat!}
                  user={message.user}
                  key={message.chat!.id}
                  images={message.images}
                />
              );
          })}
      </div>

      {/* Start Input section */}
      <section className="flex px-6 py-4 gap-3 items-center relative">
        <div className="flex absolute left-8 gap-1">
          <FileInput chatroomId={chatroomId} />
          <div className="w-[1px] bg-neutral-400"></div>
        </div>
        <Input
          placeholder="Message"
          className="rounded-xl pl-11"
          ref={messageInputRef}
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === "Enter") messageSandHandler();
          }}
        />
        <Button
          size={"icon"}
          className="bg-[--brown]"
          onClick={messageSandHandler}
          disabled={pending}
        >
          <Send fill="white" stroke="none" />
        </Button>
      </section>
      {/* End Input section */}
    </section>
  );
};

const MyMessage = ({ chat, images, user }: IMessagesWithIUsers) => {
  const hnm = timeChangeToHoursAndMinutes(chat?.createdAt!);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return (
    <div className="flex justify-end mb-3 gap-2">
      <div className="text-neutral-300 text-sm">{isClient && hnm}</div>
      <div
        className={`overflow-hidden rounded-md max-w-[300px] border-[1px] border-gray-200 ${
          images.length > 1 ? "basis-[80%] bg-gray-100" : "p-3 bg-background"
        }`}
      >
        <p className="break-words  max-w-[300px]">{chat?.message}</p>
        {images.length > 0 && <ImageLayout images={images} user={user!} />}
      </div>
    </div>
  );
};

const OtherMessage = ({ chat, user, images }: IMessagesWithIUsers) => {
  const hnm = timeChangeToHoursAndMinutes(chat!.createdAt!);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!chat?.sender) {
    return (
      <div className="flex justify-center my-4">
        <div className="text-xs text-gray-500 bg-neutral-200 px-2 py-2 rounded-full">
          {chat?.message}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 mb-3">
      <Avatar
        className="cursor-pointer"
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("selectedUser", user!.id);
          router.replace(pathname + "?" + params.toString());
        }}
      >
        <AvatarImage src={user?.image!} />
      </Avatar>
      <div
        className={`flex flex-col space-y-2 ${
          images.length > 1 ? "basis-[80%]" : "items-start"
        }`}
      >
        <div>
          <div className="font-bold">
            {user?.name}
            <span className="ml-2 font-light text-neutral-300 text-sm">
              {isClient && hnm}
            </span>
          </div>
        </div>
        <div
          className={`
          border rounded-md overflow-hidden
          max-w-[300px]
          ${
            images.length > 0
              ? "bg-background border-[1px] border-gray-200"
              : "p-3 inline-block"
          }
        `}
        >
          <p className="break-words max-w-[300px]">{chat!.message}</p>
          {images.length > 0 && <ImageLayout images={images} user={user!} />}
        </div>
      </div>
    </div>
  );
};

const ImageLayout = ({
  images,
  user,
}: {
  images: IMessageImages[];
  user: IUser;
}) => {
  const [open, setOpen] = useState(false);
  const [startIdx, setStartIdx] = useState(0);
  const imageClickHandler = (idx: number) => {
    setStartIdx(idx);
    setOpen(true);
  };
  return (
    <>
      <div
        className={`
      grid
      gap-1

      ${images.length === 2 && "h-[20vw] grid-cols-2"}
      ${images.length === 3 && "aspect-square grid-cols-6 grid-rows-2"}
      ${images.length === 4 && "aspect-square grid-cols-6 grid-rows-2"}
      ${images.length === 5 && "aspect-square grid-cols-6 grid-rows-2"}
      `}
      >
        {images.map((image, idx) => (
          <div
            key={image.id}
            className={`
        
        relative
        ${images.length === 2 && "col-span-1"}
        ${images.length === 3 ? (idx === 2 ? "col-span-6" : "col-span-3") : ""}
        ${images.length === 4 && "col-span-3"}
        ${images.length === 5 ? (idx > 1 ? "col-span-2" : "col-span-3") : ""}
        `}
          >
            {images.length > 1 && (
              <div className="absolute z-[1] w-6 h-6 text-center opacity-30 bg-black aspect-square text-white rounded-full left-1 top-1">
                {idx + 1}
              </div>
            )}
            {images.length > 1 ? (
              <Image
                fill={true}
                alt="name"
                loading="lazy"
                src={
                  "https://jed-nextjs-chatapp.s3.ap-southeast-2.amazonaws.com/" +
                  image.key
                }
                onClick={() => imageClickHandler(idx)}
                className={`
              bg-white
              cursor-pointer
              ${images.length > 1 && "object-cover"}
              `}
                sizes="(max-width: 768px) 80vw, (max-width: 1200px) 50vw,100vw"
              ></Image>
            ) : (
              <Image
                width={image.width}
                height={image.height}
                alt="name"
                loading="lazy"
                src={`https://jed-nextjs-chatapp.s3.ap-southeast-2.amazonaws.com/${image.key}`}
                onClick={() => imageClickHandler(idx)}
                className={`
            bg-white
            cursor-pointer
            ${images.length > 1 && "object-cover"}
            `}
                sizes="(max-width: 768px) 80vw, (max-width: 1200px) 50vw,100vw"
              ></Image>
            )}
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[1000px]"
          style={{ animationDuration: "0.5s" }}
        >
          <DialogHeader>
            <div className="text-sm text-center text-neutral-500">
              {user.name}
            </div>

            <Carousel
              opts={{
                startIndex: startIdx,
              }}
            >
              <CarouselContent>
                {images.map((image, idx) => (
                  <CarouselItem key={idx}>
                    <div className="relative w-[100%] h-[50vh] md:h-[80vh] max-h-[600px]">
                      <Image
                        fill
                        src={`https://jed-nextjs-chatapp.s3.ap-southeast-2.amazonaws.com/${image.key}`}
                        alt="images"
                        className="object-contain"
                        sizes="(max-width:768px) 50vw,100vw"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-0" />
                  <CarouselNext className="right-0" />
                </>
              )}
            </Carousel>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};

const FileInput = ({ chatroomId }: { chatroomId: string }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<
    { id: string; file: File; result: string }[]
  >([]);
  const [pending, setPending] = useState(false);
  const getFilesHandler = (e: ChangeEvent<HTMLInputElement>) => {
    if (!fileInputRef.current) return;

    if (fileInputRef.current.files) {
      if (fileInputRef.current.files?.length > 5) {
        toast({
          description:
            "You can only select up to 5 files. Please choose again.",
        });
        return;
      }
      setOpen(true);
      const filesFromUser = Array.from(fileInputRef.current.files);
      const files: Promise<{ id: string; file: File; result: string }>[] = [];
      filesFromUser.forEach((file) => {
        const fileReader = new FileReader();

        const newFile = new Promise<{ id: string; file: File; result: string }>(
          (resolve) => {
            fileReader.addEventListener("load", () => {
              console.log(fileReader);
              resolve({
                id: crypto.randomUUID(),
                file: file,
                result: fileReader.result as string,
              });
            });
          }
        );

        if (Math.floor(file.size / 1000) <= 1000) {
          files.push(newFile);
          fileReader.readAsDataURL(file);
        }
      });

      Promise.all(files).then((file) => {
        setFiles(file);
      });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollDivRef = useRef<HTMLDivElement>(null);
  const calculateImageDimension = (
    images: HTMLCollectionOf<HTMLImageElement>
  ) => {
    const dimension: { width: number; height: number }[] = [];

    for (let i = 0; i < images.length; i++) {
      const ratio = images[i].naturalWidth / images[i].naturalHeight;
      if (images[i].naturalWidth > 200 && images[i].naturalHeight > 200) {
        if (ratio >= 1) {
          dimension.push({ width: 200, height: 200 / ratio });
        } else {
          dimension.push({ width: 200 * ratio, height: 200 });
        }
      } else if (images[i].naturalWidth > 200) {
        dimension.push({ width: 200, height: 200 / ratio });
      } else if (images[i].naturalHeight > 200) {
        dimension.push({ width: 200 * ratio, height: 200 });
      }
    }
    return dimension;
  };
  const sendFilesHandler = async () => {
    if (!scrollDivRef.current) return;
    if (files.length === 0) return;
    setPending(true);
    const formData = new FormData();

    const images = scrollDivRef.current.getElementsByTagName("img");
    files.forEach((file) => {
      formData.append("file", file.file);
    });
    formData.append("chatroomId", chatroomId);
    const imageDimension = calculateImageDimension(images);
    formData.append("imageDimension", JSON.stringify(imageDimension));
    try {
      await axios.post("/api/chatroom/chat/images", formData);
      setOpen(false);
    } catch (e) {
      toast({
        description: "Something went wrong! Please try again.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  // Initialize input value
  useEffect(() => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open]);

  const [openImageEditor, setOpenImageEditor] = useState(false);
  const [selectedImg, setSelectedImg] = useState<{ url: string; idx: number }>({
    url: "",
    idx: 0,
  });
  const loadImageInCanvas = (url: string, idx: number) => {
    setOpenImageEditor(true);
    setSelectedImg({ url, idx });
  };

  return (
    <>
      <Label htmlFor="picture" className="flex items-center">
        <Paperclip className="rotate-[135deg] cursor-pointer" strokeWidth={1} />
      </Label>
      <Input
        ref={fileInputRef}
        type="file"
        id="picture"
        className="hidden"
        multiple
        accept=".png, .jpg, .jpeg, .pdf"
        onChange={getFilesHandler}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-80 p-0 py-3">
          <DialogHeader>
            <DialogTitle className="px-3">Send Images</DialogTitle>
          </DialogHeader>
          <div
            className="flex flex-col max-h-[50vh] overflow-auto"
            ref={scrollDivRef}
          >
            {files &&
              files.map(({ file, result, id }, idx) => (
                <div key={idx} className="hover:bg-neutral-200 px-4 py-3">
                  <div className="flex relative gap-2 items-center">
                    <Image
                      width={50}
                      height={50}
                      alt={file.name}
                      src={result}
                      className="aspect-square"
                    />
                    <div className="flex-1">
                      <div className="truncate w-40">{file.name}</div>
                      <div className="text-sm text-neutral-400">
                        {filesize(file.size, { standard: "jedec" })}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <EllipsisVertical
                          strokeWidth={1}
                          className="text-neutral-400 cursor-pointer"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            loadImageInCanvas(result, idx);
                          }}
                        >
                          edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const removedFiles = files.filter(
                              (file) => file.id !== id
                            );
                            setFiles(removedFiles);
                          }}
                        >
                          delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
          </div>
          <div className="px-3 text-sm text-gray-400">
            file size should be under 3MB
          </div>
          <div className="flex px-3 gap-2">
            <Button
              className="flex-1"
              variant={"outline"}
              onClick={() => {
                setOpen(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={sendFilesHandler}
              disabled={pending}
            >
              Send {files.length > 0 && files.length} files
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openImageEditor} onOpenChange={setOpenImageEditor}>
        <DialogContent className="max-w-none w-auto">
          <DialogHeader />
          <div className="h-[50vh] max-h-[700px]">
            <ImageEditor selectedImg={selectedImg} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

type ImageEditorProps = {
  selectedImg: {
    url: string;
    idx: number;
  };
};
const ImageEditor = ({ selectedImg }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const my = document.querySelector("#mycanvas");
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new window.Image();
    img.src = selectedImg.url;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
    };
    canvas.style.aspectRatio = `${img.width / img.height}`;
  }, []);
  return <canvas ref={canvasRef} className="h-full"></canvas>;
};
export default MessageLayout;
