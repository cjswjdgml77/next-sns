"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {};

const UserLayoutCloseButton = (props: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div
      className="
          p-4
          
          
          flex justify-end items-center cursor-pointer w-full
          "
    >
      <div className="flex items-center justify-center hover:bg-neutral-200 rounded-full ">
        <X
          className="block h-8 w-8"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("selectedUser");

            router.replace(pathname + "?" + params.toString());
            router.refresh();
          }}
        />
      </div>
    </div>
  );
};

export default UserLayoutCloseButton;
