"use client";

import React, { useState, useEffect, Suspense, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';    
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { categorizeNote, crumbleTask } from '@/libs/openai';
import { Trash2, Plus, CheckCircle2, Circle, Edit3, Calendar, Flag, Clock, Search, Filter, Loader2, Sparkles, CheckCircle, X, Dice6, ChevronDown, ChevronRight, Split, Layout, ListTodo, Expand, Shrink, Mic, MicOff, MessageSquare } from 'lucide-react';
import { TaskList } from '@/components/weave/TaskList';
import { CategoryGrid } from '@/components/weave/CategoryGrid';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NoteCard } from '@/components/weave/NoteCard';
import { CategoryModal } from '@/components/weave/CategoryModal';
import { useNotes } from '@/components/context/NotesProvider';
import { priorityColors } from '@/libs/constants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Priority } from '@/libs/constants';
import CreditsButton from '@/components/CreditsButton';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SpeechRecognition, SpeechRecognitionEvent } from '@/types/mic';
import { Note, SortOption } from '@/types';
import { RandomTaskPicker } from '@/components/weave/RandomTaskPicker';
import { AppSidebar } from '@/components/weave/appsidebar';
import {Breadcrumb,BreadcrumbItem,BreadcrumbLink,BreadcrumbList,BreadcrumbPage,BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {SidebarInset, SidebarProvider,SidebarTrigger,} from "@/components/ui/sidebar"
import { CommandBar } from '@/components/weave/CommandBar';
import { ModeToggle } from '@/components/ModeToggle';
import { MobileCommandBar } from '@/components/weave/MobileCommandBar';
import { noteQueue } from '@/libs/queueService';
import { WeekCalendar } from '@/components/weave/WeekCalendar';
import { ChatSidebar } from '@/components/weave/ChatSidebar';

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  }).format(new Date(timestamp));
};

// Loader component
const Loader = ({ variant = 'fullscreen' }: { variant?: 'fullscreen' | 'inline' }) => {
  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-card bg-opacity-30">
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

// Add this helper function to check content at all levels
const contentMatchesSearch = (note: Note, query: string): boolean => {
  // Check main task content
  if (note.content.toLowerCase().includes(query.toLowerCase())) {
    return true;
  }

  // Check category name
  if (note.category?.toLowerCase().includes(query.toLowerCase())) {
    return true;
  }

  // Check subtasks
  if (note.subtasks?.length) {
    for (const subtask of note.subtasks) {
      // Check subtask content
      if (subtask.content.toLowerCase().includes(query.toLowerCase())) {
        return true;
      }
      
      // Check sub-subtasks
      if (subtask.subtasks?.length) {
        for (const subSubtask of subtask.subtasks) {
          if (subSubtask.content.toLowerCase().includes(query.toLowerCase())) {
            return true;
          }
        }
      }
    }
  }

  return false;
};

// Add this helper function at the top level
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Replace the QueueItem interface with one that matches queueService.ts
interface QueueItem {
  id: string;
  content: string;
  timestamp: number;
  onComplete: (result: any) => void;
  onError: (error: any) => void;
}

// Add this type definition near the top of the file, with other interfaces
interface Action {
  action: string;
  data: any;
}

export default function Home() {
  const { 
    notes, 
    isLoading, 
    createNote, 
    deleteNote: deleteNoteFromDB, 
    updateNote,
    updateCategoryName: updateCategoryNameInDB,
    hasMore,
    loadMoreNotes,
    searchNotes,
    clearCache,
  } = useNotes();
  
  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [view, setView] = useState<'list' | 'board' | 'notes' | 'calendar'>('list');
  const [skipClarityCheck, setSkipClarityCheck] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const [isRolling, setIsRolling] = useState(false);
  const [randomTask, setRandomTask] = useState<Note | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [randomTaskCategory, setRandomTaskCategory] = useState<string | null>(null);
  const [processingNotes, setProcessingNotes] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: number;
  }>>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Update cached notes in the queue when notes change
  useEffect(() => {
    if (notes && notes.length > 0) {
      noteQueue.setCachedNotes(notes);
    }
  }, [notes]);

  // Track unread messages when new assistant messages arrive
  useEffect(() => {
    // If the chat is closed and we receive a new message from the assistant, increment unread count
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!isChatOpen && lastMessage && lastMessage.sender === 'assistant') {
      setUnreadMessages(prev => prev + 1);
    }
  }, [chatMessages, isChatOpen]);

  // Reset unread count when opening the chat
  useEffect(() => {
    if (isChatOpen) {
      setUnreadMessages(0);
    }
  }, [isChatOpen]);

  // Memoize the filtered and sorted notes to prevent unnecessary recalculations
  const filteredAndSortedNotes = useMemo(() => {
    if (!notes) return [];
    let filtered = [...notes];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(note => contentMatchesSearch(note, searchQuery));
    }
    
    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(note => note.priority === filterPriority);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'priority':
        filtered.sort((a, b) => {
          const priorityOrder = {
            critical:5,
            high:4,
            medium:3,
            low:2,
            optional:1,
          };
          
          // Get priority values, defaulting to 'none' if undefined
          const priorityA = a.priority ? priorityOrder[a.priority as keyof typeof priorityOrder] : priorityOrder.optional;
          const priorityB = b.priority ? priorityOrder[b.priority as keyof typeof priorityOrder] : priorityOrder.optional;
          
          // Sort by priority first
          if (priorityB !== priorityA) {
            return priorityB - priorityA;
          }
          
          // If priorities are equal, sort by timestamp (newer first)
          return b.timestamp - a.timestamp;
        });
        break;
      case 'dueDate':
        filtered.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      default:
        filtered.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    return filtered;
  }, [notes, searchQuery, filterPriority, sortBy]);

  // Update the handleInputChange function to handle key events
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { value } = e.target;
    setInput(value); // Assuming setInput is a state setter for the input value
  };

  // Update the handleKeyDown function
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey || !isExpanded) {
        e.preventDefault(); // Prevent form submission
        
        if (e.shiftKey) {
          setIsExpanded(true); // Expand the input
          // Add a newline to the input and move cursor to the end
          const cursorPosition = e.currentTarget.selectionStart;
          const newValue = input.slice(0, cursorPosition) + '\n' + input.slice(cursorPosition);
          setInput(newValue);
          
          // Use setTimeout to ensure the new textarea is mounted
          setTimeout(() => {
            const textarea = document.querySelector('textarea');
            if (textarea) {
              textarea.focus();
              textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
            }
          }, 0);
        } else if (!isExpanded) {
          // If it's a regular enter in minimized state, submit the form
          handleSubmit(new Event('submit') as any);
        }
      }
    }
  };

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 5000) {
      setNewNoteContent(value);
    }
  }, []);

  // Move the deleteNote function before handleSubmit to fix the TypeScript error
  const deleteNote = async (id: string) => {
    try {
      console.log(`🗑️ Deleting note with ID: ${id}`);
      
      // First, check if the note exists
      const noteToDelete = notes.find(note => note.id === id);
      if (!noteToDelete) {
        console.warn(`⚠️ Note with ID ${id} not found, cannot delete`);
        toast.error('Note not found');
        return;
      }
      
      // Show an immediate toast to indicate the process has started
      toast.loading(`Deleting "${noteToDelete.content.substring(0, 20)}${noteToDelete.content.length > 20 ? '...' : ''}"`, {
        id: `delete-${id}`,
        duration: 2000,
      });
      
      // Call the delete function
      await deleteNoteFromDB(id);
      
      // Show success toast after a short delay to ensure the UI has updated
      setTimeout(() => {
        console.log(`✅ Successfully deleted note with ID: ${id}`);
        toast.success('Deleted successfully', {
          id: `delete-${id}`,
        });
      }, 500);
    } catch (error) {
      console.error(`❌ Error deleting note with ID: ${id}`, error);
      toast.error('Failed to delete note', {
        id: `delete-${id}`,
      });
    }
  };

  // Memoize the submit handlers
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Add user message to chat
    const userMessage = {
      id: `user-${Date.now()}`,
      content: input.trim(),
      sender: 'user' as const,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    try {
      // Get existing categories for context
      const existingCategories = Array.from(new Set(notes.map(note => note.category)));
      
      // Add to processing queue
      const tempId = `temp-${Date.now()}`;
      setProcessingNotes(prev => new Set(prev).add(tempId));
      
      // Clear input after submission
      setInput('');
      setIsExpanded(false);
      
      // Process with AI
      noteQueue.add({
        id: tempId,
        content: userMessage.content,
        timestamp: Date.now(),
        conversationId,
        onComplete: async (result: any) => {
          try {
            console.log('AI Response:', result);
            
            // Store conversation ID if received
            if (result.conversationId) {
              setConversationId(result.conversationId);
            }

            // Process actions
            if (result.actions && result.actions.length > 0) {
              console.log(`Processing ${result.actions.length} actions from AI:`, result.actions);
              
              // Track counts for summary toast
              let createCount = 0;
              let updateCount = 0;
              let deleteCount = 0;
              
              // Process each action sequentially to avoid race conditions
              for (const action of result.actions as Action[]) {
                try {
                  console.log(`Processing action: ${action.action}`, action.data);
                  
                  if (action.action === 'create') {
                    console.log('Creating new task:', action.data.content);
                    // Ensure we have all required fields
                    const newNote = {
                      content: action.data.content,
                      category: action.data.category || 'Inbox',
                      timestamp: Date.now(),
                      isTask: action.data.isTask || false,
                      priority: action.data.priority || 'medium',
                      dueDate: action.data.dueDate,
                      startTime: action.data.startTime,
                      endTime: action.data.endTime,
                      completed: action.data.completed || false,
                      completedAt: action.data.completedAt,
                      labels: action.data.labels || [],
                      color: action.data.color
                    };
                    
                    const createdNote = await createNote(newNote);
                    console.log('Task created successfully:', createdNote.id);
                    createCount++;
                  } 
                  else if (action.action === 'update' && action.data.id) {
                    console.log(`Updating task ${action.data.id}:`, action.data);
                    const updatedNote = await updateNote(action.data.id, action.data);
                    console.log('Task updated successfully:', updatedNote.id);
                    updateCount++;
                  } 
                  else if (action.action === 'delete' && action.data.id) {
                    console.log(`Deleting task ${action.data.id}`);
                    await deleteNoteFromDB(action.data.id);
                    console.log(`Task ${action.data.id} deleted successfully`);
                    deleteCount++;
                  }
                  else {
                    console.warn(`Unknown action type: ${action.action}`);
                  }
                } catch (actionError) {
                  console.error(`Error processing ${action.action} action:`, actionError);
                  toast.error(`Failed to ${action.action} task: ${actionError.message || 'Unknown error'}`);
                }
              }
              
              // Show a summary toast of actions performed
              let actionSummary = [];
              if (createCount > 0) actionSummary.push(`${createCount} created`);
              if (updateCount > 0) actionSummary.push(`${updateCount} updated`);
              if (deleteCount > 0) actionSummary.push(`${deleteCount} deleted`);
              
              if (actionSummary.length > 0) {
                toast.success(`Tasks: ${actionSummary.join(', ')}`, { duration: 3000 });
              }
            }
            
            // Add AI messages to chat
            if (result.messages && result.messages.length > 0) {
              const aiMessages = result.messages.map((content: string, index: number) => ({
                id: `ai-${Date.now()}-${index}`,
                content,
                sender: 'assistant' as const,
                timestamp: Date.now() + index
              }));
              
              setChatMessages(prev => [...prev, ...aiMessages]);
              
              // Increment unread count if chat is closed
              if (!isChatOpen) {
                setUnreadMessages(prev => prev + aiMessages.length);
              }
            }
          } catch (error) {
            console.error('Error in onComplete handler:', error);
            toast.error('Error processing AI response');
          } finally {
            // Remove from processing
            setProcessingNotes(prev => {
              const newSet = new Set(prev);
              newSet.delete(tempId);
              return newSet;
            });
            
            setIsSubmitting(false);
          }
        },
        onError: (error) => {
          console.error('Error processing note:', error);
          toast.error('Failed to process note');
          
          // Add error message to chat
          setChatMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            content: 'Sorry, I encountered an error processing your request.',
            sender: 'assistant' as const,
            timestamp: Date.now()
          }]);
          
          // Remove from processing
          setProcessingNotes(prev => {
            const newSet = new Set(prev);
            newSet.delete(tempId);
            return newSet;
          });
          
          setIsSubmitting(false);
        }
      }, existingCategories);
    } catch (error) {
      console.error('Error submitting note:', error);
      toast.error('Failed to process note');
      setIsSubmitting(false);
    }
  }, [input, createNote, notes, deleteNoteFromDB, updateNote, conversationId, isSubmitting, isChatOpen]);

  const toggleTaskCompletion = async (id: string) => {
    const note = notes?.find(n => n.id === id);
    if (!note) return;

    try {
      const previousState = { 
        completed: note.completed,
        completedAt: note.completedAt 
      };
      
      // Update both completed state and completedAt timestamp
      await updateNote(id, { 
        completed: !note.completed,
        completedAt: !note.completed ? new Date().toISOString() : undefined
      });
      
      // Show toast with undo option
      toast.success(
        !previousState.completed ? 'Task completed! 🎉' : 'Task uncompleted', 
        {
          
          actionButtonStyle:{backgroundColor:"#3ea363", opacity:"80%"},
          action: {
            
            label: "Undo",
            onClick: async () => {
              await updateNote(id, previousState);
              toast.success('Action undone',{
                duration: 1000,
              });
            },
          },
        }
      );
      
    } catch (error) {
      console.error('Error toggling task completion:', error);
      toast.error('Failed to update task');
    }
  };

  const updateCategoryName = async (oldCategory: string, newCategory: string) => {
    await updateCategoryNameInDB(oldCategory, newCategory);
    toast.success(`Category updated to ${newCategory}`);
  };

  const updateNoteCategory = async (noteId: string, newCategory: string) => {
    await updateNote(noteId, { category: newCategory });
    toast.success('Note moved to new category');
  };

  const toggleSubtaskCompletion = async (parentId: string, subtaskId: string) => {
    const task = notes?.find(n => n.id === parentId);
    if (!task?.subtasks) return;

    const updatedSubtasks = task.subtasks.map((st:any) => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    await updateNote(parentId, {
      subtasks: updatedSubtasks
    } as Partial<Note>); // Type assertion to match the interface
  };

  const handleCrumble = async (taskId: string) => {
    const task = notes?.find(n => n.id === taskId);
    if (!task) return;

    const toastId = toast.loading('Breaking down task...', {
      duration: 10000,
    });

    try {
      let actualTask = task;
      if (task.id.startsWith('temp-')) {
        actualTask = await updateNote(task.id, task);
      }

      // Log the response from crumbleTask
      const response = await crumbleTask(actualTask.content);
      console.log("Crumble Task Response:", response); // Add this line to inspect the response

      const { subtasks, tokensUsed, creditsUsed } = response; // Destructure after checking response

      const subtasksWithIds = subtasks.map((st: any) => ({
        ...st,
        id: crypto.randomUUID(),
        parentId: actualTask.id,
        completed: false
      }));

      await updateNote(actualTask.id, {
        subtasks: subtasksWithIds
      } as Partial<Note>);
      
      toast.dismiss(toastId);
      toast.success(`Successfully broken down the task into ${subtasks.length} subtasks. Credits: ${Math.round(tokensUsed/10)}`);
    } catch (error) {
      console.error('Error crumbling task:', error);
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : 'Failed to break down task');
    }
  };

  // Memoize the dialog submit handler
  const handleDialogSubmit = useCallback(async () => {
    if (!newNoteContent.trim() || isSubmitting) {
      setIsNoteDialogOpen(false);
      return;
    }

    setIsSubmitting(true);
    const tempId = `temp-${crypto.randomUUID()}`;
    setProcessingNotes(prev => new Set(prev).add(tempId));
    await delay(2000);
    setNewNoteContent('');
    setIsNoteDialogOpen(false);
    setIsSubmitting(false);

    const existingCategories = Array.from(new Set(notes?.map(note => note.category) || []));

    // Extract hashtags from content
    const contentTags = newNoteContent.match(/#(\w+)/g)?.map(tag => tag.substring(1)) || [];
    // Combine explicit tags and hashtags from content using Array methods
    const allTags = Array.from(new Set([...contentTags, ...tags]));

    noteQueue.add({
      id: tempId,
      content: newNoteContent.trim(),
      timestamp: Date.now(),
      conversationId, // Pass the conversation ID for continuity
      onComplete: async (result) => {
        try {
          // Store the conversation ID for future interactions
          if (result.conversationId) {
            setConversationId(result.conversationId);
          }
          
          // Check if there are results to process
          if (result.results && result.results.length > 0) {
            for (const noteResult of result.results) {
              const newNote = {
                content: noteResult.enhancedContent || noteResult.content,
                category: noteResult.category,
                timestamp: Date.now(),
                isTask: noteResult.isTask,
                completed: noteResult.completed || false,
                completedAt: noteResult.completedAt,
                priority: noteResult.priority,
                dueDate: noteResult.suggestedDueDate,
                startTime: noteResult.startTime || null,
                endTime: noteResult.endTime || null,
                labels: allTags
              };

              await createNote(newNote);
            }

            // Show success message with count of items created
            toast.success(
              `Added ${result.results.length} item${result.results.length > 1 ? 's' : ''}. Credits: ${Math.round(result.tokensUsed/10)}`,
              { duration: 1500 }
            );
          } else {
            // If no results but messages exist, show the last message as toast
            if (result.messages && result.messages.length > 0) {
              const lastMessage = result.messages[result.messages.length - 1];
              toast.success(lastMessage, { duration: 3000 });
            } else {
              toast.info('Processed your request but no tasks were created', { duration: 2000 });
            }
          }
        } catch (error) {
          console.error('Error processing note:', error);
          toast.error('Failed to process note');
        } finally {
          // Remove from processing set
          setProcessingNotes(prev => {
            const newSet = new Set(prev);
            newSet.delete(tempId);
            return newSet;
          });
        }
      },
      onError: (error) => {
        console.error('Error processing note:', error);
        toast.error('Failed to process note');
        setProcessingNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });
      }
    }, existingCategories);
    
    // Reset tags
    setTags([]);
    setTagInput('');
  }, [newNoteContent, isSubmitting, createNote, notes, tags, conversationId]);

  // Add the addTag function
  const addTag = useCallback(() => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  // Add the removeTag function
  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  // Update the handleSpeechRecognition function
  const handleSpeechRecognition = useCallback(() => {
    
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let silenceTimer: any;
    const SILENCE_DURATION = 5000; // 5 seconds

    recognition.onstart = () => {
      setIsRecording(true);
      toast.success('Listening...', { duration: 2000 });
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Reset silence timer
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        stopSpeechRecognition();
        toast.info('Stopped recording due to silence', { duration: 2000 });
      }, SILENCE_DURATION);

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        
        // Check for command phrases
        if (event.results[i].isFinal) {
          if (transcript.includes('stop recording') || 
              transcript.includes('that\'s all') || 
              transcript.includes('okay done') || 
              transcript.includes('ok done') || 
              transcript.includes('ok finished')) {
            clearTimeout(silenceTimer);
            stopSpeechRecognition();
            if (input.trim()) {
              handleSubmit(new Event('submit') as any);
            }
            return;
          }
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setInput(prev => prev + ' ' + finalTranscript);
      }
    };

    recognition.onerror = (event:any) => {
      console.error('Speech recognition error:', event.error);
      toast.error('Speech recognition error. Please try again.');
      setIsRecording(false);
      clearTimeout(silenceTimer);
    };

    recognition.onend = () => {
      setIsRecording(false);
      clearTimeout(silenceTimer);
    };

    recognition.start();
  }, [input, handleSubmit]);

  // Add this function to stop speech recognition
  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Update the loading check to only show fullscreen loader on initial load
  if (isLoading && !notes.length) {
    return <Loader variant="fullscreen" />;
  }

  return (
    <>
      <AppSidebar
        notes={notes}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onUpdateCategory={updateCategoryName}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 mb-0 md:px-4">
          <div className="flex items-center gap-2 w-full">
            <SidebarTrigger className="block -ml-1" />
            <Separator orientation="vertical" className="hidden md:block mr-2 h-1" />
            
            {/* Right section with search and filters - simplified for mobile */}
            <div className="flex items-center gap-2 w-full overflow-none">
            <div className="relative flex items-center gap-2 w-full">
  {/* Search Input */}
  <div className="relative flex-1 min-w-[150px]">
    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search..."
      className="pl-8 h-8 w-full"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>

  {/* Mode Toggle */}
  <div className=" px-2">
    <ModeToggle />
  </div>
</div>


          

              {/* Mobile sort button */}
              {/* <Button 
                variant="outline" 
                size="sm" 
                className="md:hidden h-8 px-2 whitespace-nowrap"
                onClick={() => {}
              >
                <Clock className="h-4 w-4 mr-1" />
                Sort
              </Button> */}
            </div>
          </div>
        </header>

        {/* Mobile Command Bar */}
        <MobileCommandBar
          notes={notes}
          view={view}
          setView={setView}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filterPriority={filterPriority}
          setFilterPriority={setFilterPriority}
        />

        {/* Desktop Command Bar */}
        <div className="hidden md:block">
          <CommandBar
            notes={notes}
            view={view}
            setView={setView}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filterPriority={filterPriority}
            setFilterPriority={setFilterPriority}
            filteredAndSortedNotes={filteredAndSortedNotes}
            toggleTaskCompletion={toggleTaskCompletion}
            deleteNote={deleteNote}
            handleCrumble={handleCrumble}
            toggleSubtaskCompletion={toggleSubtaskCompletion}
            updateNote={updateNote}
            isLoading={isLoading}
            hasMore={hasMore}
            loadMoreNotes={loadMoreNotes}
            searchQuery={searchQuery}
            processingNotes={processingNotes}
          />
        </div>

            
          {/* Mobile Content */}
          <div className="md:hidden">
            {view === 'calendar' ? (
              <div className="flex-1 h-[calc(100vh-145px)]">
                <WeekCalendar />
              </div>
            ) : view === 'notes' ? (
              <div className="grid grid-cols-1 gap-4">
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
            ) : (
              <div className="min-w-[300px]">
                <TaskList
                  tasks={filteredAndSortedNotes.filter(note => note.isTask)}
                  onToggle={toggleTaskCompletion}
                  onDelete={deleteNote}
                  onCrumble={handleCrumble}
                  onToggleSubtask={toggleSubtaskCompletion}
                  onUpdateTask={updateNote}
                  view={view} // Will be either 'list' or 'board'
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

          {/* Mobile floating toggle */}
 

          {/* Category Modal */}
          {selectedCategory && (
            <CategoryModal
              category={selectedCategory}
              notes={filteredAndSortedNotes.filter(n => n.category === selectedCategory)}
              onUpdateNote={updateNote}
              onClose={() => setSelectedCategory(null)}
              onEdit={(newName) => {
                updateCategoryName(selectedCategory, newName);
                setSelectedCategory(newName);
              }}
              onDelete={deleteNote}
              onToggleTask={toggleTaskCompletion}
              onUpdateCategory={updateNoteCategory}
              allCategories={Array.from(new Set(notes?.map(note => note.category) || []))}
            />
          )}

          {/* Enhanced Input Form - Desktop */}
          <form
            onSubmit={handleSubmit}
            className="hidden md:block fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50"
          >
            <TooltipProvider>
              <Card className={` inset-x-0 md:max-w-2xl max-w-sm mx-auto z-50",
    "backdrop-blur-lg bg-sidebar shadow-md  duration-200 ${isExpanded ? 'p-3' : 'p-1.5'}`}>
                <div className={`flex ${isExpanded ? 'flex-row' : 'flex-row'} gap-2`}>
                  {isExpanded ? (
                    <Textarea
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type anything... tasks, ideas, notes, experiences..."
                      className="flex-1 min-h-[200px] resize-none"
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                  ) : (
                    <Input
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type anything... tasks, ideas, notes, experiences..."
                      className={`flex-1 h-8 transition-transform duration-300 ease-in-out transform focus:scale-101 focus:border-indigo-100 border-2 dark:border-gray-600 rounded-lg shadow-sm bg-sidebar-background ${
                        isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                  )}

                  {/* Button Container - Right Aligned */}
                  <div className="flex flex-col justify-between">
                    <div className={`flex ${isExpanded ? 'flex-col' : 'flex-row'} gap-1`}>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              isRecording ? stopSpeechRecognition() : handleSpeechRecognition();
                            }}
                            disabled={isSubmitting}
                          >
                            {isRecording ? <Mic className="h-4 w-4 text-red-500" /> : <MicOff className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isRecording ? "Stop Recording" : "Start Recording"}</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsExpanded(!isExpanded);
                            }}
                            disabled={isSubmitting}
                          >
                            {isExpanded ? (
                              <Shrink className="h-4 w-4" />
                            ) : (
                              <Expand className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isExpanded ? "Shrink" : "Expand"}</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger>
                          <Button 
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${skipClarityCheck ? 'text-destructive' : 'text-muted-foreground'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setSkipClarityCheck(!skipClarityCheck);
                            }}
                            disabled={isSubmitting}
                          >
                            {skipClarityCheck ? <X className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{skipClarityCheck ? "Enable Clarity Check" : "Disable Clarity Check"}</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger>
                          <Button 
                            type="submit" 
                            className={`h-8 w-8 p-0 ${isSubmitting ? 'opacity-50' : ''}`}
                            disabled={isSubmitting}
                            key="submit-button"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add Note</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Character count - only show in expanded mode */}
                {isExpanded && (
                  <div className="text-xs text-muted-foreground text-right">
                    {input.length}/500
                  </div>
                )}
              </Card>
            </TooltipProvider>
          </form>

          {/* Floating Action Button - Mobile */}
          <Button
            onClick={() => setIsNoteDialogOpen(true)}
            className="md:hidden fixed bottom-6 right-8 h-14 w-14 rounded-full shadow-lg z-50 transition-transform duration-300 ease-in-out transform hover:scale-110 hover:animate-pulse"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>

          {/* Full-screen note dialog */}
          <Dialog open={isNoteDialogOpen} onOpenChange={(open) => !isSubmitting && setIsNoteDialogOpen(open)}>
            <DialogContent className="max-w-[100vw] w-[100vw] h-[85vh] max-h-[85vh] flex flex-col p-0 border-0 rounded-none overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b h-16">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsNoteDialogOpen(false);
                    setNewNoteContent('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      isRecording ? stopSpeechRecognition() : handleSpeechRecognition();
                    }}
                    disabled={isSubmitting}
                    className="px-2"
                  >
                    {isRecording ? (
                      <Mic className="h-4 w-4 text-red-500" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </Button>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center">
                          <Button 
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={`h-9 px-2 ${skipClarityCheck ? 'text-destructive' : 'text-muted-foreground'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setSkipClarityCheck(!skipClarityCheck);
                            }}
                            disabled={isSubmitting}
                          >
                            <p className='text-sm mr-1'>Clarity</p>
                            {skipClarityCheck ? <X className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{skipClarityCheck ? "Enable Clarity Check" : "Disable Clarity Check"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button
                    onClick={handleDialogSubmit}
                    disabled={isSubmitting}
                    className={isSubmitting ? 'opacity-50' : ''}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Done
                  </Button>
                </div>
              </div>
              <textarea
                autoFocus
                value={newNoteContent}
                onChange={handleTextareaChange}
                className={`flex-1 p-1 resize-none focus:outline-none bg-background text-lg ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder="Type anything... tasks, ideas, notes, experiences..."
                maxLength={5000}
                disabled={isSubmitting}
              />
              <div className="absolute bottom-4 right-4 text-sm text-muted-foreground">
                {newNoteContent.length}/5000
              </div>

              {/* Add tags/labels section to the dialog */}
              <div className="absolute bottom-20 left-4 right-4 p-2 bg-background/80 backdrop-blur-sm border-t">
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button 
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="w-3 h-3 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 inline-flex items-center justify-center text-xs ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag (or use #tag in content)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={addTag} variant="secondary" className="h-8">
                    Add
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>



        

          {/* <CreditsButton/> */}
<CreditsButton loc="fixed hidden sm:block	 right-0 bottom-4 sm:right-2 sm:bottom-2 " />
     
  
      </SidebarInset>

      {/* Add the Chat Sidebar */}
      <ChatSidebar 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        conversationId={conversationId}
        setConversationId={setConversationId}
        messages={chatMessages}
      />

      {/* Add the floating chat button with notification badge */}
      <div className="fixed right-4 bottom-4 z-40">
        <Button
          onClick={() => setIsChatOpen(true)}
          size="lg"
          className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90 shadow-lg"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadMessages > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </Button>
      </div>
    </>
  );
}
