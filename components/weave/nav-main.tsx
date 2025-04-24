"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Folder, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SidebarMenuButton } from "../ui/sidebar";

interface Note {
  id: string;
  content: string;
  category: string;
  timestamp: number;
  isTask: boolean;
  completed?: boolean;
}

interface NavMainProps {
  notes: Note[] | null;
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
  onUpdateCategory: (oldCategory: string, newCategory: string) => void;
  isOpen: boolean;
}

export function NavMain({
  notes,
  selectedCategory,
  onSelectCategory,
  isOpen,
}: NavMainProps) {
  const safeNotes = notes || [];
  const categories = Array.from(new Set(safeNotes.map((note) => note.category)));

  const [locaIsOpen, setLocalIsOpen] = useState(false);

  useEffect(() => {
    console.log("isopen changed")
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const getCategoryStats = (category: string) => {
    const categoryNotes = safeNotes.filter((n) => n.category === category);
    const tasks = categoryNotes.filter((n) => n.isTask);
    const completedTasks = tasks.filter((t) => t.completed);
    return {
      total: categoryNotes.length,
      taskCompletion:
        tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
    };
  };

  return (
    <Collapsible
      className="w-full"
      open={locaIsOpen}
      onOpenChange={(state) => setLocalIsOpen(state)}
    >
    

      {/* Collapsible Content */}

        {locaIsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4 pr-0 border-0 bg-sidebar-background flex flex-col rounded-none max-h-[calc(100vh-180px)] mt-0 overflow-hidden">
              {/* Stats Section */}
              <div className="mb-6 space-y-4 pr-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {categories.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Categories
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{safeNotes.length}</div>
                    <div className="text-sm text-muted-foreground">
                      Total Notes
                    </div>
                  </div>
                </div>
              </div>

              {/* Categories List */}
              <ScrollArea className="flex-1 overflow-y-auto h-[50%] ">
                {categories.length === 0 ? (
                  <div className="text-center text-muted-foreground p-4">
                    <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No categories yet</p>
                    <p className="text-sm">
                      Add your first note to create a category
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {categories.map((category, index) => (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => onSelectCategory(category)}
                        className={`cursor-pointer transition-colors ${
                          selectedCategory === category
                            ? "bg-primary/10"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <Card className="p-3 hover:shadow-md transition-all">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={
                                  getCategoryStats(category).taskCompletion
                                }
                                className="w-20 h-2"
                              />
                              <span className="text-sm text-muted-foreground">
                                {getCategoryStats(category).total}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      
    </Collapsible>
  );
}
