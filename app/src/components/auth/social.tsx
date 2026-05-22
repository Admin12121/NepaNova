"use client";

import { signIn } from "next-auth/react";
import { Button } from "../ui/button";
import { Default_Login_Redirect } from "@/routes";
import { Google } from "@/icons/google";
import { InstagramLogoIcon } from "@radix-ui/react-icons";

const Social = () => {
  const onClick = async (provider: "google" | "github") => {
    signIn(provider, {
      callbackUrl: Default_Login_Redirect,
    });
  };
  return (
    <div className="flex items-center justify-center w-full gap-x-2">
      <Button
        size="lg"
        className="w-full rounded-lg fancy-button space-x-2"
        onClick={() => onClick("google")}
      >
        <Google />
        <p>Continue with Google</p>
      </Button>
    </div>
  );
};

export default Social;
