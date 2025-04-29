import React from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Filter, ListTodo, Layout, Split, Calendar } from 'lucide-react';
import { Note } from '@/types';

type SortOption = 'none' | 'priority' | 'dueDate';

interface MobileCommandBarProps {
  notes: Note[];
  view: 'list' | 'board' | 'notes' | 'calendar';
  setView: (view: 'list' | 'board' | 'notes' | 'calendar') => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
}

export function MobileCommandBar({
  notes,
  view,
  setView,
  sortBy,
  setSortBy,
  filterPriority,
  setFilterPriority,
}: MobileCommandBarProps) {
  return (
    <div className="md:hidden flex items-center gap-2 px-2 py-0 pb-2">
      {/* <Tabs defaultValue="tasks" className="flex-1">
        <TabsList className="h-8 w-full">
          <TabsTrigger value="tasks" className="flex-1 text-xs gap-1">
            Tasks
            <Badge variant="secondary" className="text-xs">
              {notes?.filter(n => n.isTask).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 text-xs gap-1">
            Notes
            <Badge variant="secondary" className="text-xs">
              {notes?.filter(n => !n.isTask).length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs> */}
         <div className="md:hidden ">
            <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg p-1">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('list')}
                  className={`rounded-full px-3 py-1 h-7 text-xs transition-colors ${
                    view === 'list' 
                      ? 'bg-primary text-accent hover:bg-secondary' 
                      : 'hover:bg-card bg-card text-primary'
                  }`}
                >
                  <ListTodo className="h-3 w-3 mr-1" />
                  List
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('notes')}
                  className={`rounded-full px-3  py-1 h-7 text-xs transition-colors ${
                    view === 'notes' 
                      ? 'bg-primary text-accent hover:bg-secondary' 
                      : 'hover:bg-card bg-card text-primary'
                  }`}
                >
                  <Layout className="h-3 w-3 mr-1" />
                  Notes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('board')}
                  className={`rounded-full px-3 h-7  py-1 text-xs transition-colors ${
                    view === 'board' 
                      ? 'bg-primary text-accent hover:bg-secondary' 
                      : 'hover:bg-card bg-card text-primary'
                  }`}
                >
                    
                  <Split className="h-3 w-3 mr-1" />
                  Board
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('calendar')}
                  className={`rounded-full px-3 h-7 py-1 text-xs transition-colors ${
                    view === 'calendar' 
                      ? 'bg-primary text-accent hover:bg-secondary' 
                      : 'hover:bg-card bg-card text-primary'
                  }`}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Cal
                </Button>
              </div>
            </div>
          </div>


      <div className="flex items-right gap-2 ml-auto mr-4">
        <div className="border rounded-md flex items-center h-8">
          <Button 
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-r-none px-2 h-8"
            onClick={() => setView('list')}
          >
            <ListTodo className="h-4 w-4" />
          </Button>
          <Button 
            variant={view === 'board' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-l-none px-2 h-8"
            onClick={() => setView('board')}
          >
            <Layout className="h-4 w-4" />
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[300px]">
            <SheetHeader>
              <SheetTitle>Sort & Filter</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort by</label>
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Recent</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger>
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
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
} 