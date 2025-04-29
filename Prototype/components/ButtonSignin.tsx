/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import config from "@/config";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ModeToggle } from "./ModeToggle";
import apiClient from "@/libs/api";

// A button to sign in with providers (Google & Magic Links).
// It redirects user to callbackUrl (config.auth.callbackUrl) after login, which is normally a private page for users to manage their accounts.
// If the user is already logged in, it shows their profile picture & provides a dropdown menu with options.
const ButtonSignin = ({
  text = "Get started",
  extraStyle,
}: {
  text?: string;
  extraStyle?: string;
}) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleClick = () => {
    // Redirect to /signin if user is not authenticated
    if (status !== "authenticated") {
      router.push("/signin");
    } else {
      router.push("/signin")
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  

  if (status === "authenticated") {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='default' size="icon" className="overflow-hidden rounded-full">
            {session.user?.image ? (
              <Image
                src={session.user?.image}
                width={36}
                height={36}
                alt="Avatar"
                className="overflow-hidden rounded-full"
              />
            ) : (
              <span className="w-6 h-6 bg-base-300 flex justify-center items-center rounded-full shrink-0">
                {session.user?.name?.charAt(0) || session.user?.email?.charAt(0)}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
          <DropdownMenuItem><ModeToggle /></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="default"
      className={`overflow-hidden rounded-full p-2 text-sm ${extraStyle ? extraStyle : ""}`}
      onClick={handleClick}
    >
      {text}
    </Button>
  );
};

export default ButtonSignin;
