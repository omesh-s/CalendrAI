"use client"

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import apiClient from "@/libs/api";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
  Star,
  Rocket,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Session } from "inspector";
import Image from "next/image";
import { Cache } from "@/libs/cache";
import { useNotes } from "../context/NotesProvider";

export function NavUser() {
  const { isMobile } = useSidebar()
  const {deleteAllNotes} =useNotes()
  const { data: session } = useSession()
  const router = useRouter()
  const [confetti, setConfetti] = useState(false)
  const confettiRef = useRef(null)
  const buttonRef = useRef(null)

  const handleSignOut = async () => {
    await Cache.clearCache()
    deleteAllNotes()
  
    document.cookie = 'idToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    signOut({ callbackUrl: "/" });
  };
 
  const triggerConfetti = () => {
    setConfetti(true)
    setTimeout(() => setConfetti(false), 1000)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>

            <SidebarMenuButton
              size="lg"
              className="  shadow-md hover:shadow-lg hover:ring-2 hover:ring-indigo-300 transition-shadow duration-300  data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mb-2 md:h-8 p-4 py-8 focus-visible:ring-0 focus-visible:ring-offset-0"
              ref={buttonRef}
              onMouseEnter={session?.user?.priceId === "Pro" ? triggerConfetti : undefined}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <Image src={session?.user?.image} alt={session?.user?.name} width={36} height={36} className="rounded-lg" />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{session?.user?.name}</span>
                <span className="truncate text-xs">{session?.user?.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <Image src={session?.user?.image} alt={session?.user?.name} width={36} height={36} className="rounded-lg" />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{session?.user?.name}</span>
                  <span className="truncate text-xs">{session?.user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-sm rounded-0`} 
                onClick={() => router.push("/#pricing")}
                onMouseEnter={session?.user?.priceId === "Pro" ? triggerConfetti : undefined}
              >
                <div className="m-auto">
                  {session?.user?.priceId === "Pro" && <Star className="inline-block h-4 w-4 mr-1 mb-1 m-auto animate-flash [animation-delay:0.4s]" />}
                  {session?.user?.priceId === "Starter" && <Rocket className="inline-block h-4 w-4 mr-1 m-auto" />}
                  {session?.user?.priceId === "Basic" && <BadgeCheck className="inline-block h-4 w-4 mr-1 mb-1" />}
                  <span className="text-sm mr-1">{session?.user?.priceId || "Basic"}</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {confetti && (
        <div ref={confettiRef} className="confetti-container z-100"></div>
      )}
    </SidebarMenu>
  )
}
