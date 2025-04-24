// components/weave/RandomTaskPicker.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dice6, Filter } from 'lucide-react';
import { Note } from '@/types';
import { priorityColors } from '@/libs/constants';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RandomTaskPickerProps {
  notes: Note[];
  onToggleTask: (id: string) => void;
}

export const RandomTaskPicker = ({ notes, onToggleTask }: RandomTaskPickerProps) => {
  const [isRolling, setIsRolling] = useState(false);
  const [randomTask, setRandomTask] = useState<Note | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);

  // Get unique categories
  const categories = Array.from(new Set(notes?.map(note => note.category) || []));

  const rollForRandomTask = () => {
    setIsRolling(true);
    
    // Filter for uncompleted tasks based on the selected category
    const uncompletedTasks = notes.filter(n => 
      n.isTask && 
      !n.completed && 
      (!selectedCategory || n.category === selectedCategory)
    );
    
    // Remove current random task from possibilities
    const availableTasks = randomTask 
      ? uncompletedTasks.filter(t => t.id !== randomTask.id) 
      : uncompletedTasks;

    if (availableTasks.length === 0) {
      toast.error('No more uncompleted tasks available!');
      setIsRolling(false);
      return;
    }

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * availableTasks.length);
      setRandomTask(availableTasks[randomIndex]);
      setIsRolling(false);
      setIsResultDialogOpen(true);
    }, 800);
  };

  return (
    <>
      <Card className="p-0 border-0 m-0">
        <div className="flex items-center gap-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                {selectedCategory || "All Categories"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Category</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedCategory(null);
                      setIsDialogOpen(false);
                    }}
                  >
                    All Categories
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsDialogOpen(false);
                      }}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="default"
            className={`flex-1 relative ${isRolling ? 'animate-shake' : ''}`}
            onClick={rollForRandomTask}
            disabled={isRolling}
          >
            <Dice6 className={`h-5 w-5 mr-2 ${isRolling ? 'animate-spin' : ''}`} />
            Roll Random Task
          </Button>
        </div>
      </Card>

      {/* Result Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Random Task Selected</DialogTitle>
          </DialogHeader>
          <AnimatePresence mode="wait">
            {randomTask && (
              <motion.div
                key={randomTask.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-animation opacity-20 rounded-lg"></div>
                <div className="relative z-10 space-y-4">
                  <p className="text-lg">{randomTask.content}</p>
                  
                  {randomTask.category && (
                    <div className="text-sm text-muted-foreground">
                      Category: {randomTask.category}
                    </div>
                  )}
                  
                  {randomTask.priority && (
                    <Badge className={`${priorityColors.badge[randomTask.priority]}`}>
                      {randomTask.priority}
                    </Badge>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        onToggleTask(randomTask.id);
                        setIsResultDialogOpen(false);
                        setRandomTask(null);
                      }}
                    >
                      Mark as Done
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        rollForRandomTask();
                      }}
                    >
                      Roll Again
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsResultDialogOpen(false);
                        setRandomTask(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};