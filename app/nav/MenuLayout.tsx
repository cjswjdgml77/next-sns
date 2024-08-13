import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import MenuItems from "./MenuItems";
import { db, users } from "@/schema";
import { Session } from "next-auth";
import { eq } from "drizzle-orm";

type Props = {};

const Menu = async (props: Props) => {
  const session = await auth();
  return (
    <div
      className="
        bg-primary rounded-3xl text-primary-foreground
        flex flex-col items-center py-10
      "
    >
      <MenuItems />
      {session && <SignOut session={session} />}
    </div>
  );
};

function SignOut({ session }: { session: Session }) {
  return (
    <form
      action={async () => {
        "use server";

        await db
          .update(users)
          .set({ isActive: false })
          .where(eq(users.email, session.user?.email!));
        await signOut({ redirectTo: "/auth/login" });
      }}
    >
      <button type="submit">
        <LogOut className="mx-auto" strokeWidth={1.75} />
      </button>
    </form>
  );
}
export default Menu;
