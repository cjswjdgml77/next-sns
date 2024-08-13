"use client";
import { CircleUser, Home, MessageCircle, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
type Props = {};

const MenuItems = (props: Props) => {
  const pathname = usePathname();
  function active(path: string) {
    if (pathname === path) {
      return "white";
    }
    return "lightgray";
  }
  return (
    <div
      className="
                flex flex-col items-center gap-8 px-6
                flex-1
                "
    >
      <Link href="/" className="">
        <Home strokeWidth={1.75} color={active("/")} />
      </Link>
      <Link href="/user">
        <CircleUser strokeWidth={1.75} color={active("/user")} />
      </Link>
      <Link href="/message">
        <MessageCircle strokeWidth={1.75} color={active("/message")} />
      </Link>
      <Link href="/setting">
        <Settings strokeWidth={1.75} color={active("/setting")} />
      </Link>
    </div>
  );
};

export default MenuItems;
