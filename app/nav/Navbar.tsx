import { auth } from "@/auth";
import Logo from "./Logo";
import MenuLayout from "./MenuLayout";

type Props = {};

const Navbar = async (props: Props) => {
  const session = await auth();
  if (!session) return null;
  return (
    <div className="grid grid-rows-[80px_1fr] md:px-3 md:pb-5 overflow-hidden opacity-0">
      <Logo />
      <MenuLayout />
    </div>
  );
};

export default Navbar;
