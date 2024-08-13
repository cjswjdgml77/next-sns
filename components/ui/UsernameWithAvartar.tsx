import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { twMerge } from "tailwind-merge";
import UserImage from "@/public/default-userimage.png";
type Props = {
  name: string;
  image: string | null;
  imageSize?: string;
  className?: string;
};

const UsernameWithAvartar = ({ name, image, imageSize, className }: Props) => {
  return (
    <div className={`${twMerge("flex gap-2 items-center", className)}`}>
      <Avatar className={`${imageSize}`}>
        <AvatarImage src={image!} />
        <AvatarFallback>
          <Image alt={"user_image"} src={UserImage} width={100} height={100} />
        </AvatarFallback>
      </Avatar>
      <div>{name}</div>
    </div>
  );
};

export default UsernameWithAvartar;
