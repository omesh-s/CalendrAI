import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ListTodo, Layout, Clock, Flag, Calendar, Plus } from 'lucide-react';
import { Note } from '@/types';
import { RandomTaskPicker } from './RandomTaskPicker';
import { TaskList } from './TaskList';
import { NoteCard } from './NoteCard';
import { ProcessingNoteSkeleton } from './ProcessingNoteSkeleton';
import { WeekCalendar } from './WeekCalendar';
import { cn } from '@/libs/utils';

type SortOption = 'none' | 'priority' | 'dueDate';

interface CommandBarProps {
  notes: Note[];
  view: 'list' | 'board' | 'notes' | 'calendar';
  setView: (view: 'list' | 'board' | 'notes' | 'calendar') => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
  filteredAndSortedNotes: Note[];
  toggleTaskCompletion: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  handleCrumble: (id: string) => Promise<void>;
  toggleSubtaskCompletion: (parentId: string, subtaskId: string) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note>;
  isLoading: boolean;
  hasMore: boolean;
  loadMoreNotes: () => void;
  searchQuery: string;
  processingNotes: Set<string>;
}

export function CommandBar({
  notes,
  view,
  setView,
  sortBy,
  setSortBy,
  filterPriority,
  setFilterPriority,
  filteredAndSortedNotes,
  toggleTaskCompletion,
  deleteNote,
  handleCrumble,
  toggleSubtaskCompletion,
  updateNote,
  isLoading,
  hasMore,
  loadMoreNotes,
  searchQuery,
  processingNotes,
}: CommandBarProps) {
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);

  return (
    <Tabs defaultValue="tasks" className="w-full">
      {/* Command Bar */}
      <div className="flex items-center justify-between gap-4 gap-y-0 px-4 mb-0 ">
        {/* Left section - View toggles and Sort/Filter */}
        <div className="flex items-center gap-4">
          <TabsList className="h-9">
            <TabsTrigger value="tasks" className="gap-2">
              Tasks
              <Badge variant="secondary">
                {notes?.filter(n => n.isTask).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              Notes
              <Badge variant="secondary">
                {notes?.filter(n => !n.isTask).length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <Separator orientation="vertical" className="h-6" />

          {/* Sort and Filter */}
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)} >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Recent</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger  className="w-[130px] h-9">
              <SelectValue placeholder="Priority..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="optional">Optional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right section - View Toggle Buttons and Actions */}
        <div className="flex items-center gap-4">
          <div className="border rounded-md flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={view === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-r-none px-3 h-8"
                    onClick={() => setView('list')}
                  >
                    <ListTodo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List View</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-4" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={view === 'board' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="px-3 h-8 border-x-0"
                    onClick={() => setView('board')}
                  >
                    <Layout className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Board View</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-4" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={view === 'calendar' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-l-none px-3 h-8"
                    onClick={() => setView('calendar')}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Calendar View</TooltipContent>
              </Tooltip>

              {view === 'calendar' && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="px-3 h-8"
                        onClick={() => setIsAddEventDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Event</TooltipContent>
                  </Tooltip>
                </>
              )}
            </TooltipProvider>
          </div>

          <RandomTaskPicker 
            notes={notes} 
            onToggleTask={toggleTaskCompletion}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 py-0">
        <TabsContent value="tasks" className="mt-0">
          <div className="min-w-[300px]">
            {view === 'calendar' ? (
              <div className="h-[calc(100vh-100px)]">
                <WeekCalendar 
                  isAddEventDialogOpen={isAddEventDialogOpen}
                  setIsAddEventDialogOpen={setIsAddEventDialogOpen}
                />
              </div>
            ) : (
              <div className='mt-6'>
              <TaskList
                tasks={filteredAndSortedNotes.filter(note => note.isTask)}
                onToggle={toggleTaskCompletion}
                onDelete={deleteNote}
                onCrumble={handleCrumble}
                onToggleSubtask={toggleSubtaskCompletion}
                onUpdateTask={updateNote}
                view={view}
                sortBy={sortBy}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={loadMoreNotes}
                searchQuery={searchQuery}
                processingNotes={processingNotes}
              />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAndSortedNotes
              .filter(n => !n.isTask)
              .map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onDelete={deleteNote}
                />
              ))}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
} 