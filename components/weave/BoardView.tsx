"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Circle, Trash2, Split, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { getRelativeTime } from '@/utils/time';
import { Priority } from '@/libs/constants';
import { priorityLevels, priorityColors } from '@/libs/constants';
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { crumbleTask } from '@/libs/openai';
import AutoResizeTextarea from './AutoResizeTextarea'; // Ensure this component is accessible
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided, DraggableStateSnapshot, DropResult } from '@hello-pangea/dnd';

interface SubTask {
  id: string;
  parentId: string;
  content: string;
  completed?: boolean;
  priority?: Priority;
  estimatedTime?: string;
  subtasks?: SubTask[];
}

interface Task {
  id: string;
  content: string;
  completed?: boolean;
  category: string;
  timestamp: number;
  priority?: Priority;  
  subtasks?: SubTask[];
  dueDate?: string;
}

interface BoardViewProps {
  tasks: Task[];
  expandedTasks: Set<string>;
  toggleExpand: (taskId: string) => void;
  handleMainTaskToggle: (taskId: string) => void;
  handleNestedSubtaskToggle: (taskId: string, subtaskId: string, parentSubtaskId?: string) => void;
  handleSubtaskCrumble: (parentId: string, subtask: SubTask) => void;
  handleEditComplete: (taskId: string) => void;
  handleSubtaskEdit: (taskId: string, subtaskId: string, newContent: string, parentSubtaskId?: string) => void;
  cyclePriority: (task: Task) => void;
  cycleSubtaskPriority: (taskId: string, subtask: SubTask) => void;
  cycleNestedSubtaskPriority: (taskId: string, parentSubtaskId: string, nestedSubtaskId: string) => void;
  editingTaskId: string | null;
  editContent: string;
  setEditingTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditContent: React.Dispatch<React.SetStateAction<string>>;
  onDelete: (id: string) => void;
  onCrumble: (id: string) => void;
  updateTaskCategory?: (taskId: string, newCategory: string) => Promise<void>;
}

const groupTasksByCategory = (tasks: Task[]) => {
  return tasks.reduce((acc, task) => {
    const category = task.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);
};

const BoardView: React.FC<BoardViewProps> = ({
  tasks,
  expandedTasks,
  toggleExpand,
  handleMainTaskToggle,
  handleNestedSubtaskToggle,
  handleSubtaskCrumble,
  handleEditComplete,
  handleSubtaskEdit,
  cyclePriority,
  cycleSubtaskPriority,
  cycleNestedSubtaskPriority,
  editingTaskId,
  editContent,
  setEditingTaskId,
  setEditContent,
  onDelete,
  onCrumble,
  updateTaskCategory,
}) => {
  const categorizedTasks = groupTasksByCategory(tasks);
  const categoryEntries = Object.entries(categorizedTasks);
  const rows = Math.ceil(categoryEntries.length / 2);
  
  const completionRate = tasks.length > 0 
    ? (tasks.filter(t => t.completed).length / tasks.length) * 100 
    : 0;

  // Handle drag end event
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    // Return if dropped outside a droppable area or in the same position
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    // Get the task ID and update its category
    const taskId = draggableId;
    const newCategory = destination.droppableId;
    
    if (updateTaskCategory) {
      updateTaskCategory(taskId, newCategory);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Card className="p-2 md:p-4 h-screen overflow-y-auto">      
        <div className="mb-4">
          <Progress value={completionRate} className="w-full" />
          <div className="text-sm text-muted-foreground mt-2">
            {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(categorizedTasks).map(([category, categoryTasks]) => (
            <Droppable key={category} droppableId={category}>
              {(provided, snapshot) => (
                <Card 
                  key={category} 
                  className={`border rounded-lg ${snapshot.isDraggingOver ? 'bg-muted/30' : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="p-3">
                    <h3 className="font-semibold mb-2 flex items-center justify-between">
                      {category}
                      <Badge variant="secondary">
                        {categoryTasks.length}
                      </Badge>
                    </h3>
                    <ScrollArea className="max-h-[350px] overflow-y-auto">
                      <div className="space-y-2 pr-2">
                        {categoryTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`group flex flex-col border-dashed border-2 p-2 rounded-md hover:bg-muted/50 ${
                                  snapshot.isDragging ? 'bg-muted/70 shadow-lg' : ''
                                }`}
                              >
                                {/* Task Header */}
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleMainTaskToggle(task.id)}
                                    >
                                      {task.completed ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Circle className="h-4 w-4" />
                                      )}
                                    </Button>
                                    
                                    {/* Task content and editing */}
                                    <div className="flex-grow">
                                      {editingTaskId === task.id ? (
                                        <AutoResizeTextarea
                                          value={editContent}
                                          onChange={(e) => setEditContent(e.target.value)}
                                          onBlur={() => handleEditComplete(task.id)}
                                          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleEditComplete(task.id);
                                            }
                                          }}
                                          className="w-full text-sm resize-none p-1 border rounded focus:ring-1 focus:ring-primary"
                                          autoFocus
                                        />
                                      ) : (
                                        <span 
                                          className={`block text-sm ${task.completed ? "line-through text-muted-foreground" : ""} cursor-pointer break-words`}
                                          onClick={() => {
                                            setEditingTaskId(task.id);
                                            setEditContent(task.content);
                                          }}
                                        >
                                          {task.content}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Action buttons */}
                                  <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                    {/* Priority button */}
                                    {task.priority && (
                                      <Badge 
                                        className={`capitalize cursor-pointer transition-colors duration-200 ${priorityColors.badge[task.priority]}`}
                                        onClick={() => cyclePriority(task)}
                                      >
                                        {task.priority}
                                      </Badge>
                                    )}
                                    
                                    {task.subtasks?.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7"
                                        onClick={() => toggleExpand(task.id)}
                                      >
                                        {expandedTasks.has(task.id) ? (
                                          <ChevronDown className="h-3 w-3 text-yellow-500" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 text-yellow-500" />
                                        )}
                                        <span className="text-xs ml-1">{task.subtasks.length}</span>
                                      </Button>
                                    )}
                                    
                                    {!task.completed && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => onCrumble(task.id)}
                                      >
                                        <Split className="h-4 w-4 hover:text-blue-500" />
                                      </Button>
                                    )}
                                    
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 "
                                      onClick={() => onDelete(task.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Task metadata */}
                               
                                
                                {/* Subtasks section */}
                                {task.subtasks && task.subtasks.length > 0 && expandedTasks.has(task.id) && (
                                  <div className="pl-9 mt-2">
                                    <div 
                                      className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer"
                                      onClick={() => toggleExpand(task.id)}
                                    >
                                      {expandedTasks.has(task.id) ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                      <span>
                                        {task.subtasks.filter(st => st.completed).length} of {task.subtasks.length} subtasks
                                      </span>
                                    </div>
                                    
                                    <div className="mt-2 space-y-2">
                                      {task.subtasks.map((subtask) => (
                                        <div 
                                          key={subtask.id}
                                          className="ml-4 flex items-start gap-2 group"
                                        >
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 mt-0.5"
                                            onClick={() => handleNestedSubtaskToggle(task.id, subtask.id)}
                                          >
                                            {subtask.completed ? (
                                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            ) : (
                                              <Circle className="h-3 w-3" />
                                            )}
                                          </Button>
                                          
                                          <div className="flex-grow">
                                            {editingTaskId === subtask.id ? (
                                              <form 
                                                onSubmit={(e) => {
                                                  e.preventDefault();
                                                  handleSubtaskEdit(task.id, subtask.id, editContent);
                                                  setEditingTaskId(null);
                                                  setEditContent('');
                                                }}
                                                className="flex-1 min-w-0"
                                              >
                                                <Input
                                                  value={editContent}
                                                  onChange={(e) => setEditContent(e.target.value)}
                                                  onBlur={() => {
                                                    handleSubtaskEdit(task.id, subtask.id, editContent);
                                                    setEditingTaskId(null);
                                                    setEditContent('');
                                                  }}
                                                  autoFocus
                                                  className="h-6 text-sm"
                                                />
                                              </form>
                                            ) : (
                                              <span 
                                                className={`flex-1 text-sm ${subtask.completed ? "line-through text-muted-foreground" : ""} cursor-pointer`}
                                                onClick={() => {
                                                  setEditingTaskId(subtask.id);
                                                  setEditContent(subtask.content);
                                                }}
                                              >
                                                {subtask.content}
                                              </span>
                                            )}
                                            
                                            {/* Nested subtasks - simplified */}
                                            {subtask.subtasks && subtask.subtasks.length > 0 && (
                                              <div className="mt-1 ml-2 space-y-1">
                                                {subtask.subtasks.map(nestedSubtask => (
                                                  <div 
                                                    key={nestedSubtask.id}
                                                    className="flex items-start gap-1 group"
                                                  >
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-4 w-4"
                                                      onClick={() => handleNestedSubtaskToggle(task.id, nestedSubtask.id, subtask.id)}
                                                    >
                                                      {nestedSubtask.completed ? (
                                                        <CheckCircle2 className="h-2 w-2 text-green-500" />
                                                      ) : (
                                                        <Circle className="h-2 w-2" />
                                                      )}
                                                    </Button>
                                                    <span className={`text-xs ${nestedSubtask.completed ? "line-through text-muted-foreground" : ""}`}>
                                                      {nestedSubtask.content}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Subtask actions */}
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                            {subtask.priority && (
                                              <Badge 
                                                variant="outline" 
                                                className={`${priorityColors.badge[subtask.priority]} text-xs cursor-pointer`}
                                                onClick={() => cycleSubtaskPriority(task.id, subtask)}
                                              >
                                                {subtask.priority}
                                              </Badge>
                                            )}
                                            
                                            {!subtask.completed && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5"
                                                onClick={() => handleSubtaskCrumble(task.id, subtask)}
                                              >
                                                <Split className="h-2.5 w-2.5" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </ScrollArea>
                  </div>
                </Card>
              )}
            </Droppable>
          ))}
        </div>
      </Card>
    </DragDropContext>
  );
};

export default BoardView;