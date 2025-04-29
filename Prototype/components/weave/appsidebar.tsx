"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Boxes,
  Command,
  FileText,
  Frame,
  GalleryThumbnails,
  GalleryVerticalEnd,
  Map,
  NotebookTabs,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"
import { Note } from "@/types"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "../ui/button"


function Header() {
    return (
        <div className="w-full h-full px-6 py-3 pt-4 bg-sidebar-background text-gray-800  font-semibold text-lg border-b shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center space-x-3">
            
          <PieChart className="w-6 h-6 text-primary font-bold" />
          <span className="text-primary tracking-wide font-bold text-xl"> Categories</span>
        </div>
      </div>
      
    );
  }
  
  

  
  // Modified Sidebar Component
  export function AppSidebar({ 
    notes,
    selectedCategory,
    onSelectCategory,
    onUpdateCategory,
    ...props 
  }: React.ComponentProps<typeof Sidebar> & {
    notes: Note[] | null
    selectedCategory: string | null
    onSelectCategory: (category: string) => void
    onUpdateCategory: (oldCategory: string, newCategory: string) => void
  }) {
    const [isOpen, setIsOpen] = React.useState(true);
  
    return (
      <Sidebar 
        variant="sidebar"
        collapsible="offcanvas"
        className="border-r transition-all duration-300 ease-in-out" 
        {...props}
        onToggle={() => setIsOpen(!isOpen)}
      >
        <SidebarHeader className="border-0 px-0 py-0">
          <Header />
        </SidebarHeader>
        <SidebarContent className="px-0 py-0 overflow-hidden h-[100%]">
          {isOpen && (
            <NavMain 
              notes={notes}
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
              onUpdateCategory={onUpdateCategory}
              isOpen={isOpen}
            />
          )}
        </SidebarContent>
        <SidebarFooter className="border-t px-2 pt-4 pb-0">
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }
  