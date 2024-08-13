"use client";
import { useFormStatus } from "react-dom";
import { Button } from "./ui/button";

const ServerActionSubmitBtn = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      Signin with email
    </Button>
  );
};

export default ServerActionSubmitBtn;
