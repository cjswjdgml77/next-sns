import { Mail } from "lucide-react";

type Props = {};

const page = (props: Props) => {
  return (
    <div className="absolute w-full h-screen bg-accent">
      <div className="flex flex-col items-center justify-center h-full">
        <Mail strokeWidth={0.8} size={100} className="-translate-y-10" />
        <div className="text-xl font-semibold">
          We sent a link to your email
        </div>
        <div className="mt-3">please Check your email !</div>
      </div>
    </div>
  );
};

export default page;
