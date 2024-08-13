import { auth, signIn } from "@/auth";
import ServerActionSubmitBtn from "@/components/ServerActionSubmitBtn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";
import { redirect } from "next/navigation";

type Props = {};

const LoginPage = async (props: Props) => {
  const session = await auth();
  if (session) redirect("/");
  return (
    <div
      className="
            absolute
            w-full
            h-screen
            flex
            items-center
            bg-accent
        "
    >
      <div
        className="
            max-w-xs
            w-full 
            mx-auto
            bg-accent
            flex flex-col items-center rounded-md
            py-6
            gap-2
            "
      >
        <h1 className="w-0 h-0 opacity-0">Login page</h1>
        <h2 className="">Welcome back</h2>
        <div className="text-neutral-400 text-sm mb-3">
          Please login to your account
        </div>
        <div className="w-full">
          <SignInWithEmail />

          <div className="w-full text-center my-3">or</div>
          <SignIn />
        </div>
        <div className="mt-6 text-sm text-neutral-400">
          © jed cheon 2024|All Rights Reserved
        </div>
      </div>
    </div>
  );
};

function SignIn() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <Button variant="outline" className="w-full">
        <span className="text-xs mr-2">G+</span>
        Login with google
      </Button>
    </form>
  );
}
function SignInWithEmail() {
  return (
    <form
      action={async (formData) => {
        "use server";
        await signIn("nodemailer", formData);
      }}
      className="space-y-4"
    >
      <Input
        type="email"
        required
        name="email"
        placeholder="user email"
      ></Input>
      <ServerActionSubmitBtn />
    </form>
  );
}
export default LoginPage;
