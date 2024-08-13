import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IUser } from "@/type/types";

type Props = {
  users: IUser[];
};

const MultipleUserAvatar = ({ users }: Props) => {
  if (!users) return <div className="w-10 h-10"></div>;
  return (
    <div className="min-w-10 w-10 h-10 aspect-square relative">
      {users.map((user, idx, arr) => (
        <Avatar
          key={user.id}
          className={`
                ${
                  arr.length === 2 &&
                  `absolute w-[calc(1.25rem*sqrt(2))] h-[calc(1.25rem*sqrt(2))] ${
                    idx === 1 &&
                    "absolute border-l-2 border-t-2 box-content translate-x-[30%] translate-y-[30%]"
                  }`
                }
                ${arr.length === 3 && ""}
                `}
        >
          <AvatarImage src={user.image!} />
          <AvatarFallback></AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
};

export default MultipleUserAvatar;
