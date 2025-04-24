"use client";

import { useState, useEffect } from "react";
import type { JSX } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from 'framer-motion';

import ButtonSignin from "./ButtonSignin";
import { HoveredLink, Menu, MenuItem, ProductItem } from "@/components/ui/navbar-menu";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ArrowBigRight, ArrowRight, LogIn, MountainIcon, MoveRight } from "lucide-react";
import { IconChartPie, IconChartPie2, IconChartPie3, IconChartPie4 } from "@tabler/icons-react";

const links = [
  { href: "/#video", label: "How It Works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  
];

interface TabProps {
  text: string;
  href: string;
  selected: boolean;
  setSelected: (text: string) => void;
}

const cta: JSX.Element = <ButtonSignin extraStyle="btn-primary" />;

const Header = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  useEffect(() => {
    setIsOpen(false);
  }, [searchParams]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative w-full flex items-center justify-center">
      <Navbar className="top-2" />
    </div>
  );
};

const Tab = ({ text, href, selected, setSelected }: TabProps) => {
  return (
    

    <Link href={href} className="md:block hidden">
      <Button
      variant="ghost"
        onClick={() => setSelected(text)}
        className={`lg:font-lg sm:font-sm`}
      >
        <span className="relative z-10">{text}</span>
 
      </Button>
    </Link>
  );
};

function Navbar({ className }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();

  const handleTabClick = (text: string) => {
    setActive(text);
  };

  return (
    <div className={cn("fixed top-10 inset-x-0 md:max-w-2xl max-w-sm  mx-auto  z-50", className)}>
      <Menu setActive={setActive}>
      <Link href="#" className="flex items-center pl-8 gap-2 font-base  font-work md:mr-auto" prefetch={false}>
                {/* <MountainIcon className="h-6 w-5" />  */}
                {/* <IconChartPie4/> */}
                {/* <IconChartPie2/> */}
                <IconChartPie/>
                {/* <IconChartPie3/> */}
                <div></div>
                Calendr
                <span className="sr-only">CAalendr</span>
              </Link>
        <div className="flex space-x-4">
          {links.map(link => (
           <Tab
           key={link.href}
           text={link.label}
           href={link.href}
           selected={active === link.label}
           setSelected={handleTabClick}
         />
         
          ))}
        </div>
        <Link href={"/signin"} className="">
       
        <Button
        variant="default"
        className={`font-semibold `}
      >
       Sign Up Free
       <ArrowRight className="ml-2 mt-3/5 h-5 w-4 font-lg" />
 
      </Button>
    </Link>
      </Menu>
    </div>
  );
}
export default Header;

