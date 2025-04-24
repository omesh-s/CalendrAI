"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Circle, Trash2, Split, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { getRelativeTime } from '@/utils/time';
import { Priority, priorityLevels, priorityColors } from '@/libs/constants';
import { toast } from 'sonner';
import { crumbleTask } from '@/libs/openai';
import BoardView from './BoardView';
import AutoResizeTextarea from './AutoResizeTextarea'; // Ensure this component is accessible
import { Loader2 } from 'lucide-react';
import { ProcessingNoteSkeleton } from './ProcessingNoteSkeleton';
import { useNotes } from '@/components/context/NotesProvider';

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
  completedAt?: string;
    category: string;
  timestamp: number;
  priority?: Priority;  
  subtasks?: SubTask[];
  dueDate?: string;
}

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCrumble: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  view: 'list' | 'board' | 'notes' | 'calendar';
  sortBy: 'none' | 'priority' | 'dueDate';
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  searchQuery?: string;
  processingNotes: Set<string>;
}

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  }).format(new Date(timestamp));
};

const Loader = ({ variant = 'fullscreen' }: { variant?: 'fullscreen' | 'inline' }) => {
  if (variant === 'fullscreen') {
    return (
      <div className={`inset-0 flex items-center justify-center bg-card bg-opacity-30` }>
        <Loader2 className="animate-spin h-12 w-12 border-0 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex justify-center py-4">
      <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
    </div>
  );
};

export function TaskList({ 
  tasks, 
  onToggle, 
  onDelete, 
  onCrumble, 
  onToggleSubtask, 
  onUpdateTask, 
  view, 
  sortBy,
  isLoading,
  hasMore,
  onLoadMore,
  searchQuery = '',
  processingNotes
}: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [showCompleted, setShowCompleted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isTogglingRef = useRef(false);

  // Create intersection observer for infinite scrolling
  const observer = useRef<IntersectionObserver | null>(null);
  const lastTaskElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || !hasMore) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isTogglingRef.current) {
        console.log('Loading more tasks...');
        onLoadMore();
      }
    }, {
      root: scrollAreaRef.current,
      threshold: 0.5
    });

    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, onLoadMore]);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const cyclePriority = (task: Task) => {
    const currentIndex = task.priority 
      ? priorityLevels.indexOf(task.priority)
      : -1;
    const nextIndex = (currentIndex + 1) % priorityLevels.length;
    const newPriority = priorityLevels[nextIndex];
    
    // Use the existing onToggle or similar function to update the task
    onUpdateTask(task.id, { priority: newPriority });
  };

  const handleMainTaskToggle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;
    
    // If unchecking, cascade to all subtasks and their nested subtasks
    if (!newCompleted && task.subtasks) {
      const uncheckedSubtasks = task.subtasks.map(st => ({
        ...st,
        completed: false,
        subtasks: st.subtasks?.map(nested => ({
          ...nested,
          completed: false
        }))
      }));
      onUpdateTask(taskId, { 
        completed: false,
        subtasks: uncheckedSubtasks
      });
    } else {
      // Update completedAt when checking the task
      onToggle(taskId);

    }
  };

   // Grouping functions can remain here or be moved to a utility file
  const groupTasksByDate = (tasks: Task[]) => {
    const groups = tasks.reduce((acc, task) => {
      const date = formatDate(task.timestamp);
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
    
    return Object.entries(groups).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  };

  // Modify the grouping logic to include all tasks
  const groupTasks = (tasks: Task[]) => {
    if (sortBy === 'priority') {
      // For priority sorting, group by priority level instead of date
      const priorityOrder = ['critical', 'high', 'medium', 'low', 'optional'];
      const groups = priorityOrder.reduce((acc, priority) => {
        const tasksWithPriority = tasks.filter(task => task.priority === priority);
        if (tasksWithPriority.length > 0) {
          acc[priority] = tasksWithPriority;
        }
        return acc;
      }, {} as Record<string, Task[]>);

      // Sort tasks within each priority group by timestamp
      Object.values(groups).forEach(taskGroup => {
        taskGroup.sort((a, b) => b.timestamp - a.timestamp);
      });

      return Object.entries(groups);
    } else if (sortBy === 'dueDate') {
      const now = Date.now();
      const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

      // Separate tasks into different categories
      const overdueTasks = tasks.filter(task => task.dueDate && new Date(task.dueDate).getTime() < now && new Date(task.dueDate).getTime() > twoDaysAgo);
      const upcomingTasks = tasks.filter(task => task.dueDate && new Date(task.dueDate).getTime() > now);
      const noDueDateTasks = tasks.filter(task => !task.dueDate);

      // Group tasks by due date
      const groupedOverdue = overdueTasks.reduce((acc, task) => {
        const dueDate = formatDate(new Date(task.dueDate).getTime());
        if (!acc[dueDate]) {
          acc[dueDate] = [];
        }
        acc[dueDate].push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      const groupedUpcoming = upcomingTasks.reduce((acc, task) => {
        const dueDate = formatDate(new Date(task.dueDate).getTime());
        if (!acc[dueDate]) {
          acc[dueDate] = [];
        }
        acc[dueDate].push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      // Combine the groups in the desired order
      const combinedGroups = {
        ...groupedOverdue,
        ...groupedUpcoming,
        'No Due Date': noDueDateTasks,
      };

      return Object.entries(combinedGroups).sort((a, b) => {
        // Sort by due date for overdue and upcoming tasks
        if (a[0] === 'No Due Date') return 1; // Push no due date tasks to the end
        if (b[0] === 'No Due Date') return -1; // Push no due date tasks to the end
        return new Date(a[0]).getTime() - new Date(b[0]).getTime();
      });
    } else {
      // Use existing date grouping for other sort types
      return groupTasksByDate(tasks);
    }
  };

  // Modify the grouping logic to include all tasks
  const groupedTasks = groupTasks(tasks);

  // Handler functions
  const handleSubtaskToggle = (parentId: string, subtaskId: string) => {
    const parentTask = tasks.find(t => t.id === parentId);
    if (!parentTask?.subtasks) return;

    // First, toggle the subtask
    onToggleSubtask(parentId, subtaskId);

    // Then check if all subtasks will be completed
    const updatedSubtasks = parentTask.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    
    const allSubtasksCompleted = updatedSubtasks.every(st => st.completed);
    
    // If all subtasks are completed and the parent isn't, complete the parent
    if (allSubtasksCompleted && !parentTask.completed) {
      onToggle(parentId);
    }
  };

  const cycleSubtaskPriority = (taskId: string, subtask: SubTask) => {
    const currentIndex = subtask.priority 
      ? priorityLevels.indexOf(subtask.priority)
      : -1;
    const nextIndex = (currentIndex + 1) % priorityLevels.length;
    const newPriority = priorityLevels[nextIndex];
    
    // Update the parent task with the modified subtask
    const parentTask = tasks.find(t => t.id === taskId);
    if (!parentTask?.subtasks) return;
    
    const updatedSubtasks = parentTask.subtasks.map(st => 
      st.id === subtask.id ? { ...st, priority: newPriority } : st
    );
    
    onUpdateTask(taskId, { subtasks: updatedSubtasks });
  };

  const handleEditComplete = (taskId: string) => {
    if (editContent.trim() !== '') {
      onUpdateTask(taskId, { content: editContent.trim() });
    }
    setEditingTaskId(null);
    setEditContent('');
  };

  const handleNestedSubtaskToggle = (taskId: string, subtaskId: string, parentSubtaskId?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.subtasks) return;

    // Helper function to update completion status and cascade changes
    const updateSubtaskCompletion = (subtasks: SubTask[]): { updatedSubtasks: SubTask[], allCompleted: boolean } => {
      let allCompleted = true;
      const updated = subtasks.map(st => {
        if (st.id === subtaskId) {
          // Toggle the clicked subtask
          const newCompleted = !st.completed;
          return { 
            ...st,
            completed: newCompleted,
            // If unchecking, cascade to all nested subtasks
            subtasks: st.subtasks?.map(nested => ({
              ...nested,
              completed: newCompleted ? nested.completed : false
            }))
          };
        } else if (st.id === parentSubtaskId && st.subtasks) {
          // Update nested subtasks
          const { updatedSubtasks, allCompleted: nestedCompleted } = updateSubtaskCompletion(st.subtasks);
          return { 
            ...st, 
            subtasks: updatedSubtasks,
            completed: nestedCompleted
          };
        } else if (st.subtasks?.length) {
          // Check other subtasks with nested items
          const { updatedSubtasks, allCompleted: nestedCompleted } = updateSubtaskCompletion(st.subtasks);
          return { ...st, subtasks: updatedSubtasks };
        }
        allCompleted = allCompleted && st.completed;
        return st;
      });

      return { updatedSubtasks: updated, allCompleted };
    };

    // If unchecking the main task, uncheck all subtasks
    if (task.completed && subtaskId === task.id) {
      const uncheckedSubtasks = task.subtasks.map(st => ({
        ...st,
        completed: false,
        subtasks: st.subtasks?.map(nested => ({
          ...nested,
          completed: false
        }))
      }));
      onUpdateTask(taskId, { 
        completed: false,
        subtasks: uncheckedSubtasks
      });
      return;
    }

    // Update the entire task structure
    const { updatedSubtasks, allCompleted } = updateSubtaskCompletion(task.subtasks);

    // Update the task with new subtasks
    onUpdateTask(taskId, { 
      subtasks: updatedSubtasks,
      ...(allCompleted && !task.completed ? { completed: true } : {})
    });
  };

  const handleSubtaskCrumble = async (parentId: string, subtask: SubTask) => {
    const parentTask = tasks.find(t => t.id === parentId);
    if (!parentTask?.subtasks) return;

    const toastId = toast.loading('Breaking down subtask...', {
      duration: 10000,
    });

    try {
      // Get sibling tasks for context
      const siblingTasks = parentTask.subtasks
        .filter(st => st.id !== subtask.id)
        .map(st => st.content);

      const {subtasks} = await crumbleTask(subtask.content, {
        parentTask: parentTask.content,
        siblingTasks,
        subtaskContent: subtask.content
      });

      const subtasksWithIds = subtasks.map(st => ({
        ...st,
        id: crypto.randomUUID(),
        parentId: subtask.id, // Use the subtask's ID as the parent
        completed: false
      }));

      // Update the subtask with its new nested subtasks
      const updatedSubtasks = parentTask.subtasks.map(st =>
        st.id === subtask.id ? { ...st, subtasks: subtasksWithIds } : st
      );

      await onUpdateTask(parentId, {
        subtasks: updatedSubtasks
      });

      toast.dismiss(toastId);
      toast.success(`Subtask broken down into ${subtasks.length} steps`);
    } catch (error) {
      console.error('Error crumbling subtask:', error);
      toast.dismiss(toastId);
      toast.error('Failed to break down subtask');
    }
  };

  const handleSubtaskEdit = (taskId: string, subtaskId: string, newContent: string, parentSubtaskId?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.subtasks) return;

    let updatedSubtasks;
    if (parentSubtaskId) {
      // Update nested subtask
      updatedSubtasks = task.subtasks.map(st => {
        if (st.id === parentSubtaskId) {
          return {
            ...st,
            subtasks: st.subtasks?.map(nst =>
              nst.id === subtaskId ? { ...nst, content: newContent } : nst
            )
          };
        }
        return st;
      });
    } else {
      // Update regular subtask
      updatedSubtasks = task.subtasks.map(st =>
        st.id === subtaskId ? { ...st, content: newContent } : st
      );
    }

    onUpdateTask(taskId, { subtasks: updatedSubtasks });
  };

  const cycleNestedSubtaskPriority = (taskId: string, parentSubtaskId: string, nestedSubtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.subtasks) return;

    const updatedSubtasks = task.subtasks.map(st => {
      if (st.id === parentSubtaskId && st.subtasks) {
        return {
          ...st,
          subtasks: st.subtasks.map(nst => {
            if (nst.id === nestedSubtaskId) {
              const currentIndex = nst.priority 
                ? priorityLevels.indexOf(nst.priority)
                : -1;
              const nextIndex = (currentIndex + 1) % priorityLevels.length;
              const newPriority = priorityLevels[nextIndex];
              return { ...nst, priority: newPriority };
            }
            return nst;
          })
        };
      }
      return st;
    });

    onUpdateTask(taskId, { subtasks: updatedSubtasks });
  };

  const completionRate = tasks.length > 0 
    ? (tasks.filter(t => t.completed).length / tasks.length) * 100 
    : 0;

  const handleCompletedToggle = () => {
    if (!scrollAreaRef.current) return;
    
    isTogglingRef.current = true;
    
    if (showCompleted) {
      // If we're hiding completed tasks, first scroll to the last uncompleted task
      const lastUncompleted = scrollAreaRef.current.querySelector('[data-last-uncompleted="true"]');
      // if (lastUncompleted) {
      //   lastUncompleted.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // }
      
      // Wait for scroll to complete before hiding completed tasks
      setTimeout(() => {
        setShowCompleted(false);
        setTimeout(() => {
          isTogglingRef.current = false;
        }, 100);
      }, 300);
    } else {
      // If showing completed tasks, just show them and scroll to top
      setShowCompleted(true);
      scrollAreaRef.current.scrollTop = 0;
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 100);
    }
  };

  // Add cleanup for isTogglingRef when component unmounts
  useEffect(() => {
    return () => {
      isTogglingRef.current = false;
    };
  }, []);

  // Add the function to update a task's category
  const handleUpdateTaskCategory = async (taskId: string, newCategory: string) => {
    try {
      await onUpdateTask(taskId, { category: newCategory });
      toast.success(`Task moved to ${newCategory}`);
    } catch (error) {
      console.error('Error updating task category:', error);
      toast.error('Failed to move task');
    }
  };

  if (view === 'board') {
    return (
      <BoardView
        tasks={tasks}
        expandedTasks={expandedTasks}
        toggleExpand={toggleExpand}
        handleMainTaskToggle={handleMainTaskToggle}
        handleNestedSubtaskToggle={handleNestedSubtaskToggle}
        handleSubtaskCrumble={handleSubtaskCrumble}
        handleEditComplete={handleEditComplete}
        handleSubtaskEdit={handleSubtaskEdit}
        cyclePriority={cyclePriority}
        cycleSubtaskPriority={cycleSubtaskPriority}
        cycleNestedSubtaskPriority={cycleNestedSubtaskPriority}
        editingTaskId={editingTaskId}
        editContent={editContent}
        setEditingTaskId={setEditingTaskId}
        setEditContent={setEditContent}
        onDelete={onDelete}
        onCrumble={onCrumble}
        updateTaskCategory={handleUpdateTaskCategory}
      />
    );
  }

  // Regular List view
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[300px] max-w-full">
        <Card className="p-4 pb-2">
          <div className="mb-2">
            <Progress value={completionRate} className="w-full" />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">
                {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCompletedToggle}
                className="text-xs flex items-center gap-2 hover:bg-accent/50 transition-all duration-300"
              >
                {showCompleted ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1 text-primary"
                  >
                    <Eye className="h-4 w-4 text-primary" />
                    <span>Hide Completed</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1 text-muted-foreground"
                  >
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                    <span>Show Completed</span>
                  </motion.div>
                )}
              </Button>
            </div>
          </div>

          <ScrollArea ref={scrollAreaRef} className="h-[calc(105vh-16rem)] pb-4 px-2 md:px-4">
            {/* Show processing notes at the top */}
            {processingNotes.size > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                  Processing {processingNotes.size} note{processingNotes.size > 1 ? 's' : ''}...
                </h3>
                <ProcessingNoteSkeleton />
              </div>
            )}
            
            {groupedTasks.map(([group, groupTasks], groupIndex) => {
              // Check if all tasks in the group are completed
              const allTasksCompleted = groupTasks.every(task => task.completed);

              // Only render the group if not all tasks are completed or showCompleted is true
              if (allTasksCompleted && !showCompleted) {
                return null; // Skip rendering this group
              }

              return (
                <div key={group} className="mb-6 pb-18">
                  {/* Only render the date header if showCompleted is true or not all tasks are completed */}
                  {(showCompleted || !allTasksCompleted) && (
                    <h3 className={`text-sm font-semibold mb-2 ${
                      sortBy === 'priority' 
                        ? 'capitalize text-primary' 
                        : 'text-muted-foreground'
                    }`}>
                      {group}
                    </h3>
                  )}
                  <div className="space-y-2">
                    {groupTasks.map((task, taskIndex) => {
                      // Only set ref on the last visible task
                      const isLastVisible = 
                        !showCompleted ? 
                        (!task.completed && !hasNextUncompleted(groupTasks, taskIndex)) :
                        (groupIndex === groupedTasks.length - 1 && taskIndex === groupTasks.length - 1);

                      // Check if we should display the task based on showCompleted
                      if (!showCompleted && task.completed) {
                        return null; // Skip rendering completed tasks if showCompleted is false
                      }

                      return (
                        <div
                          key={task.id}
                          ref={isLastVisible ? lastTaskElementRef : null}
                          className="task-item"
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`group border-dashed border-2 flex flex-col md:flex-row md:items-center gap-2 p-2 rounded-md hover:bg-muted/50 ${
                              task.completed ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleMainTaskToggle(task.id)}
                              >
                                {task.completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Circle className="h-4 w-4" />
                                )}
                              </Button>
                              {editingTaskId === task.id ? (
                                <form 
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleEditComplete(task.id);
                                  }}
                                  className="flex-1 min-w-0"
                                >
                                  <Input
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    onBlur={() => handleEditComplete(task.id)}
                                    autoFocus
                                    className={`h-6 text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}
                                  />
                                </form>
                              ) : (
                                <span 
                                  className={`flex-1 text-sm ${task.completed ? "line-through" : ""} cursor-pointer break-words`}
                                  onClick={() => {
                                    setEditingTaskId(task.id);
                                    setEditContent(task.content);
                                  }}
                                >
                                  {task.content}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-8 md:ml-0">
                              {task.priority && (
                                <Badge 
                                  className={`capitalize cursor-pointer transition-colors duration-200 ${priorityColors.badge[task.priority]}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cyclePriority(task);
                                  }}
                                >
                                  {task.priority}
                                </Badge>
                              )}
                              
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span>{task.category}</span>
                                {task.dueDate && (
                                  <span className={getRelativeTime(task.dueDate)?.color || 'text-muted-foreground'}>
                                    • {getRelativeTime(task.dueDate)?.text}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 h-6"
                                    onClick={() => toggleExpand(task.id)}
                                  >
                                    {expandedTasks.has(task.id) ? (
                                      <ChevronDown className="h-3 w-3 text-yellow-500" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-yellow-500" />
                                    )}
                                    <span className="text-xs">{task.subtasks.length}</span>
                                  </Button>
                                )}
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => onCrumble(task.id)}
                                >
                                  <Split className="h-4 w-4 hover:text-blue-500" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                  onClick={() => onDelete(task.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>

                          {/* Subtasks section remains the same but with adjusted padding */}
                          {task.subtasks && task.subtasks.length > 0 && expandedTasks.has(task.id) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="ml-4 md:ml-8 space-y-1 border-l-2 border-dashed pl-2 md:pl-4 pr-2 md:pr-8 mt-2"
                            >
                              {task.subtasks.map((subtask) => (
                                <motion.div
                                  key={subtask.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex flex-col gap-1"
                                >
                                  <div className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/30 group bg-muted/10">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => handleNestedSubtaskToggle(task.id, subtask.id, subtask.parentId)}
                                    >
                                      {subtask.completed ? (
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Circle className="h-3 w-3" />
                                      )}
                                    </Button>
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
                                    
                                    {/* Show chevron if subtask has nested subtasks */}
                                    {subtask.subtasks && subtask.subtasks.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1 h-5 w-8 p-0 mx-2"
                                        onClick={() => toggleExpand(subtask.id)}
                                      >
                                        {expandedTasks.has(subtask.id) ? (
                                          <ChevronDown className="h-4 w-4 text-yellow-500" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-yellow-500" />
                                        )}
                                        <span className="text-xs">{subtask.subtasks.length}</span>
                                      </Button>
                                    )}

                                    {subtask.priority && (
                                      <Badge 
                                        variant="outline" 
                                        className={`${priorityColors.badge[subtask.priority]} text-xs cursor-pointer`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          cycleSubtaskPriority(task.id, subtask);
                                        }}
                                      >
                                        {subtask.priority}
                                      </Badge>
                                    )}
                                    
                                    {subtask.estimatedTime && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ~{subtask.estimatedTime}
                                      </span>
                                    )}
                                    
                                    {!subtask.completed && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSubtaskCrumble(task.id, subtask);
                                        }}
                                      >
                                        <Split className="h-3 w-3 hover:text-blue-500" />
                                      </Button>
                                    )}
                                  </div>

                                  {/* Render nested subtasks if they exist and are expanded */}
                                  {subtask.subtasks && subtask.subtasks.length > 0 && expandedTasks.has(subtask.id) && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="ml-6 space-y-1 border-l-2 border-dotted pl-4 pr-8 mt-1"
                                    >
                                      {subtask.subtasks.map((nestedSubtask) => (
                                        <motion.div
                                          key={nestedSubtask.id}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          className="flex items-center gap-2 p-1 rounded-md hover:bg-muted/20 group"
                                        >
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4"
                                            onClick={() => handleNestedSubtaskToggle(task.id, nestedSubtask.id, subtask.id)}
                                          >
                                            {nestedSubtask.completed ? (
                                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            ) : (
                                              <Circle className="h-3 w-3" />
                                            )}
                                          </Button>
                                          {editingTaskId === nestedSubtask.id ? (
                                            <form 
                                              onSubmit={(e) => {
                                                e.preventDefault();
                                                handleSubtaskEdit(task.id, nestedSubtask.id, editContent, subtask.id);
                                                setEditingTaskId(null);
                                                setEditContent('');
                                              }}
                                              className="flex-1 min-w-0"
                                            >
                                              <Input
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                onBlur={() => {
                                                  handleSubtaskEdit(task.id, nestedSubtask.id, editContent, subtask.id);
                                                  setEditingTaskId(null);
                                                  setEditContent('');
                                                }}
                                                autoFocus
                                                className="h-5 text-xs"
                                              />
                                            </form>
                                          ) : (
                                            <span 
                                              className={`flex-1 text-xs ${nestedSubtask.completed ? "line-through text-muted-foreground" : ""} cursor-pointer`}
                                              onClick={() => {
                                                setEditingTaskId(nestedSubtask.id);
                                                setEditContent(nestedSubtask.content);
                                              }}
                                            >
                                              {nestedSubtask.content}
                                            </span>
                                          )}
                                          {nestedSubtask.priority && (
                                            <Badge 
                                              variant="outline" 
                                              className={`${priorityColors.badge[nestedSubtask.priority]} text-xs cursor-pointer`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                cycleNestedSubtaskPriority(task.id, subtask.id, nestedSubtask.id);
                                              }}
                                            >
                                              {nestedSubtask.priority}
                                            </Badge>
                                          )}
                                          {nestedSubtask.estimatedTime && (
                                            <span className="text-xs text-muted-foreground">
                                              ~{nestedSubtask.estimatedTime}
                                            </span>
                                          )}
                                        </motion.div>
                                      ))}
                                    </motion.div>
                                  )}
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Loading indicator and end of list message */}
            {isLoading && tasks?.length > 0 && (
              <Loader variant="inline" />
            )}

            {!hasMore && !isLoading && tasks.length > 0 && (
              <div className="py-4 pb-12 text-center text-muted-foreground">
                No more tasks to load
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

// Add this helper function at the top of your component
const hasNextUncompleted = (tasks: Task[], currentIndex: number): boolean => {
  for (let i = currentIndex + 1; i < tasks.length; i++) {
    if (!tasks[i].completed) return true;
  }
  return false;
};

export default TaskList;