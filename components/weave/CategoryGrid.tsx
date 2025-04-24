"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PieChart, Folder, Notebook } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Priority } from '@/libs/constants';
import ButtonAccount from "@/components/ButtonAccount";

interface Note {
  id: string;
  content: string;
  category: string;
  timestamp: number;
  isTask: boolean;
  completed?: boolean;
  priority?: Priority;
  dueDate?: string;
  labels?: string[];
  subtasks?: {
    id: string;
    parentId: string;
    content: string;
    completed?: boolean;
    priority?: Priority;
    estimatedTime?: string;
  }[];
}

interface CategoryGridProps {
  notes: Note[] | null;
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
  onUpdateCategory: (oldCategory: string, newCategory: string) => void;
}

export function CategoryGrid({ notes, selectedCategory, onSelectCategory, onUpdateCategory }: CategoryGridProps) {
  // Handle null notes array
  const safeNotes = notes || [];
  const categories = Array.from(new Set(safeNotes.map(note => note.category)));

  // Calculate count of notes per category
  const categoryCount = categories.reduce((acc, category) => {
    acc[category] = safeNotes.filter(note => note.category === category).length;
    return acc;
  }, {} as Record<string, number>);

  const [categoryEdits, setCategoryEdits] = useState<Record<string, string | null>>(
    Object.fromEntries(categories.map(cat => [cat, null]))
  );

  const handleCategoryChange = (category: string, newCategoryName: string) => {
    setCategoryEdits(prev => ({ ...prev, [category]: newCategoryName }));
  };

  const handleCategoryBlur = (category: string) => {
    const newCategoryName = categoryEdits[category];
    if (newCategoryName && newCategoryName !== category) {
      onUpdateCategory(category, newCategoryName);
    }
    setCategoryEdits(prev => ({ ...prev, [category]: null }));
  };

  // Add category stats
  const getCategoryStats = (category: string) => {
    const categoryNotes = safeNotes.filter(n => n.category === category);
    const tasks = categoryNotes.filter(n => n.isTask);
    const completedTasks = tasks.filter(t => t.completed);
    return {
      total: categoryNotes.length,
      taskCompletion: tasks.length ? (completedTasks.length / tasks.length) * 100 : 0
    };
  };

  return (
    <Card className="p-4 h-full flex flex-col max-h-[95vh]">
      {/* Category insights */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            <h2 className="text-xl font-bold">Categories</h2>
          </div>
          <div className="flex items-center gap-2">
          <div className="relative bg-blue-400 p-2 cursor-pointer rounded-full border-2 border-blue-600 shadow-sm shadow-rose-400/50">
              <Notebook 
                className="h-5 w-5 text-blue-600 cursor-pointer transition-shadow" 
                onClick={() => window.location.href = '/dashboard'}
              />
            </div>
            <ButtonAccount />
        
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{categories.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total Categories</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{safeNotes.length}</div>
            <div className="text-sm text-muted-foreground">Total Items</div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        {categories.length === 0 ? (
          <div className="text-center text-muted-foreground p-4">
            <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No categories yet</p>
            <p className="text-sm">Add your first note to create a category</p>
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
                className={`cursor-pointer transition-colors ${selectedCategory === category ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
              >
                <Card className="p-3 hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={getCategoryStats(category).taskCompletion} 
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
  );
}
