"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import apiClient from "@/libs/api";
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
import config from "@/config";
import { BadgeCheck, Rocket, Star } from "lucide-react"; // Import the star icon from Lucide React
import { Cache } from "@/libs/cache";

const ButtonAccount = () => {
  const { data: session, status } = useSession();
  const [confetti, setConfetti] = useState(false);
  const confettiRef = useRef(null);
  const buttonRef = useRef(null);
  const router = useRouter()

  const handleSignOut = async () => {
    await Cache.clearCache();
    document.cookie = 'idToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    signOut({ callbackUrl: "/" });
  };


  const triggerConfetti = () => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1000);
  };

  // Generate confetti pieces
  useEffect(() => {
    if (confetti && confettiRef.current && buttonRef.current) {
      const container = confettiRef.current;
      const button = buttonRef.current.getBoundingClientRect();
      container.style.left = `${button.left + window.scrollX}px`;
      container.style.top = `${button.top + window.scrollY}px`;
      const numPieces = 50;
      const colors = ["#dac9f0","#ffb5fa","#ffb296","#fad67a"];
      container.innerHTML = "";

      for (let i = 0; i < numPieces; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * 3 * Math.PI;
        const radius = Math.random() * 200;
        piece.style.setProperty("--x", `${Math.cos(angle) * radius}px`);
        piece.style.setProperty("--y", `${Math.sin(angle) * radius}px`);
        container.appendChild(piece);
      }
    }
  }, [confetti]);

  // Define the name and styles for each plan
  const getPlanInfo = () => {
    const priceId = session?.user?.priceId;
  
    if (!priceId) {
      return { name: "Basic", styles: "bg-zinc-900 text-white" };
    }
  
    for (const plan of config.stripe.plans) {
      if (plan.priceId.includes(priceId)) {
        switch (plan.dbName) {
          case "Starter":
            return {
              name: "Starter",
              styles: "bg-gradient-to-r from-orange-300 via-amber-200 to-rose-400 text-purple-800 text-purple-800 hover:animate-jiggle text-zinc-900",
            };
          case "Pro":
            return {
              name: "Pro",
              styles: "bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-purple-300 text-purple-800 font-bold hover:animate-jiggle [animation-delay:0.4s]",
            };
        }
      }
    }
  
    return { name: "Basic", styles: "bg-zinc-900 text-white" };
  };
  

  const { name: planName, styles: planStyles } = getPlanInfo();

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            {session?.user?.image ? (
              <Image
                src={session?.user?.image}
                width={36}
                height={36}
                alt="Avatar"
                className="overflow-hidden rounded-full"
              />
            ) : (
              <span className={`w-6 h-6 flex justify-center items-center rounded-full ${planStyles}`}>
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0)}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card/95 w-[170px]">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuItem 
            className={`text-sm rounded-0 ${planStyles}`} 
            ref={buttonRef}
            onClick = {()=>{
              router.push("/#pricing")

            }}
            onMouseEnter={planName === "Pro" ? triggerConfetti : undefined}
          >
            <div className="m-auto">
              {planName === "Pro" && <Star className="inline-block h-4 w-4 mr-1 mb-1 m-auto animate-flash [animation-delay:0.4s]" />}
              {planName === "Starter" && <Rocket className="inline-block h-4 w-4 mr-1 m-auto" />}
              {planName === "Basic" && <BadgeCheck className="inline-block h-4 w-4 mr-1 mb-1" />}
              <span className="text-sm mr-1">{planName}</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
          <DropdownMenuItem><ModeToggle/></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confetti animation */}
      {confetti && (
        <div ref={confettiRef} className="confetti-container z-100"></div>
      )}
    </>
  );
};

export default ButtonAccount;