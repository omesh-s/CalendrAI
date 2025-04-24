import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format, addDays, startOfWeek, getDay, isSameDay, parseISO, addHours, isToday } from 'date-fns';
import { useNotes } from '../context/NotesProvider';
import { Button } from '../ui/button';
import { 
  MoreHorizontal, Plus, ChevronLeft, ChevronRight, 
  MoveHorizontal, Trash2, Edit, Tags, Clock, Layout, Flag, X, Copy, ClipboardPaste,
  CircleArrowLeft,
  CircleArrowRight,
  StepBack,
  StepForward,
  MoveLeft,
  MoveRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/libs/utils';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger,
} from '@/components/ui/popover';
import { debounce } from 'lodash';
import { Note } from '@/types';
import { Priority } from '@/libs/constants';

// Constants
const HOURS = Array.from({ length: 24 }, (_, i) => i); // Change to 24 hours, starting from 0
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_HEIGHT = 80;
const MIN_EVENT_HEIGHT = 30; // Minimum 30min event height

// Priority color mapping
const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/90 border-red-700 hover:bg-red-500 text-white',
  high: 'bg-orange-500/90 border-orange-700 hover:bg-orange-500 text-white',
  medium: 'bg-yellow-500/90 border-yellow-700 hover:bg-yellow-500 text-white',
  low: 'bg-emerald-500/90 border-emerald-700 hover:bg-emerald-500 text-white',
  optional: 'bg-blue-500/90 border-blue-700 hover:bg-blue-500 text-white'
};

// Add predefined event colors that can be selected
const eventColors = {
  blue: 'bg-blue-500/90 border-blue-700 hover:bg-blue-500 text-white',
  green: 'bg-emerald-500/90 border-emerald-700 hover:bg-emerald-500 text-white',
  purple: 'bg-purple-500/90 border-purple-700 hover:bg-purple-500 text-white',
  pink: 'bg-pink-500/90 border-pink-700 hover:bg-pink-500 text-white',
  orange: 'bg-orange-500/90 border-orange-700 hover:bg-orange-500 text-white',
  yellow: 'bg-yellow-500/90 border-yellow-700 hover:bg-yellow-500 text-white',
  red: 'bg-red-500/90 border-red-700 hover:bg-red-500 text-white',
  indigo: 'bg-indigo-500/90 border-indigo-700 hover:bg-indigo-500 text-white',
  teal: 'bg-teal-500/90 border-teal-700 hover:bg-teal-500 text-white',
  gray: 'bg-gray-500/90 border-gray-700 hover:bg-gray-500 text-white',
};

// Type for event colors
type EventColor = keyof typeof eventColors;

// Get random color from eventColors
const getRandomColor = (): EventColor => {
  const colors = Object.keys(eventColors) as EventColor[];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Types
type CalendarEvent = {
  id: string;
  content: string;
  startTime: string;
  endTime: string;
  category: string;
  priority?: "optional" | "low" | "medium" | "high" | "critical";
  isTask: boolean;
  labels?: string[];
  color?: string; // New color property
};

type EventFormData = {
  id?: string;
  content: string;
  startTime: string;
  endTime: string;
  category: string;
  priority: string;
  labels: string[];
  color: string; // New color property
};

interface WeekCalendarProps {
  isAddEventDialogOpen?: boolean;
  setIsAddEventDialogOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

// Helper to calculate position and height for events
const calculateEventStyle = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Calculate start hour and minutes (relative to 0 AM start)
  const startHour = start.getHours(); // No offset needed for 24 hour format
  const startMinutes = start.getMinutes();
  const startPosition = startHour * HOUR_HEIGHT + (startMinutes / 60) * HOUR_HEIGHT;
  
  // Calculate duration in hours
  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  const height = durationHours * HOUR_HEIGHT;
  
  return {
    top: Math.max(0, startPosition), // Ensure it's not negative
    height: Math.max(height, MIN_EVENT_HEIGHT), // Enforce minimum height
  };
};

// Convert position back to time
const positionToTime = (
  top: number, 
  height: number, 
  day: Date
): { startTime: string; endTime: string } => {
  // Create a new date object for the event day
  const baseDate = new Date(day);
  baseDate.setHours(0, 0, 0, 0); // Start at midnight (0 AM)
  
  // Calculate hours from top position
  const hoursFromTop = top / HOUR_HEIGHT;
  const startHour = Math.floor(hoursFromTop); // No need to add offset for 24 hour format
  const startMinutes = Math.round((hoursFromTop - Math.floor(hoursFromTop)) * 60);
  
  // Set the start time
  const startTime = new Date(baseDate);
  startTime.setHours(startHour, startMinutes, 0, 0);
  
  // Calculate duration from height
  const durationHours = height / HOUR_HEIGHT;
  
  // Set the end time
  const endTime = new Date(startTime);
  endTime.setTime(startTime.getTime() + durationHours * 60 * 60 * 1000);
  
  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  };
};

export const WeekCalendar = ({ isAddEventDialogOpen: externalDialogOpen, setIsAddEventDialogOpen: setExternalDialogOpen }: WeekCalendarProps) => {
  // REF to track last external dialog state to prevent update loops
  const lastExternalDialogState = useRef<boolean | undefined>(undefined);
  
  // State setup
  const { notes, createNote, updateNote, deleteNote, setNotes, getTasksByDateRange, updateCalendarEvent } = useNotes();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date()); // Start with today instead of start of week
  
  // Tracking for pending calendar updates
  const pendingUpdates = useRef(new Map<string, NodeJS.Timeout>());
  const lastDragTime = useRef<number>(0);
  
  // Internal dialog state - completely separate from external
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [eventData, setEventData] = useState<EventFormData>({
    content: '',
    startTime: '',
    endTime: '',
    category: 'Calendar',
    priority: 'medium',
    labels: [],
    color: getRandomColor(), // Initialize with random color
  });
  
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; hour: number } | null>(null);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');
  
  // Drag and resize state
  const [dragMode, setDragMode] = useState<'none' | 'drag' | 'resize-top' | 'resize-bottom'>('none');
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState({ 
    mouseY: 0, 
    mouseX: 0,
    eventTop: 0, 
    eventHeight: 0,
    dayIndex: 0 
  });
  const [currentDragPosition, setCurrentDragPosition] = useState({ 
    top: 0, 
    height: 0,
    dayIndex: 0 
  });
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false); // Track if we're currently updating state
  
  // Calendar days calculation using useMemo to prevent recalculations
  const days = useMemo(() => {
    // Start with the current day and show the next 6 days
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, [startDate]);
  
  // Process notes into calendar events - memoized to prevent unnecessary recalculations
  const calendarEvents = useMemo(() => {
    return notes
      .filter(note => note.startTime && note.endTime)
      .map(note => {
        // Use type assertion to access the color property
        const noteWithColor = note as Note & { color?: string };
        
        return {
          id: note.id,
          content: note.content,
          startTime: note.startTime!,
          endTime: note.endTime!,
          category: note.category,
          priority: note.priority,
          isTask: note.isTask,
          labels: note.labels || [],
          color: noteWithColor.color || getRandomColor(), // Use the color or generate a random one
        } as CalendarEvent;
      });
  }, [notes]);

  // Clean up pending updates when component unmounts
  useEffect(() => {
    return () => {
      pendingUpdates.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      pendingUpdates.current.clear();
    };
  }, []);

  // SAFE dialog open/close functions
  const openDialog = useCallback((editMode: boolean) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    
    setIsEditMode(editMode);
    setInternalDialogOpen(true);
    
    // Also update external state if it exists
    if (setExternalDialogOpen) {
      setExternalDialogOpen(true);
    }
    
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 50);
  }, [setExternalDialogOpen]);

  const closeDialog = useCallback(() => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    
    setInternalDialogOpen(false);
    
    // Also update external state if it exists
    if (setExternalDialogOpen) {
      setExternalDialogOpen(false);
    }
    
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 50);
  }, [setExternalDialogOpen]);

  // Handle external dialog open/close - one way sync only
  useEffect(() => {
    // Skip if we're currently updating or value hasn't changed
    if (isUpdatingRef.current || externalDialogOpen === lastExternalDialogState.current) {
      return;
    }
    
    // Update ref to prevent loops
    lastExternalDialogState.current = externalDialogOpen;
    
    // Only sync from external to internal
    if (externalDialogOpen !== undefined && externalDialogOpen !== internalDialogOpen) {
      setInternalDialogOpen(externalDialogOpen);
      
      // Reset edit mode when closing
      if (!externalDialogOpen && internalDialogOpen) {
        setIsEditMode(false);
      }
    }
  }, [externalDialogOpen, internalDialogOpen]);

  // Scroll to current time on initial load
  useEffect(() => {
    if (isToday(currentDate) && containerRef.current) {
      scrollToCurrentTime();
    }

    // Update current time line every minute
    const timeUpdateInterval = setInterval(() => {
      if (isToday(currentDate) && currentTimeRef.current) {
        setCurrentDate(new Date());
      }
    }, 60000);

    return () => clearInterval(timeUpdateInterval);
  }, [currentDate]);

  // Scroll to current time function
  const scrollToCurrentTime = useCallback(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Scroll to current time, no hour restrictions
      const scrollPosition = currentHour * HOUR_HEIGHT + 
                          (now.getMinutes() / 60) * HOUR_HEIGHT;
      
      containerRef.current.scrollTo({
        top: scrollPosition - 200,
        behavior: 'smooth'
      });
    }
  }, []);

  // Calculate current time position for the time indicator
  const getCurrentTimePosition = useCallback(() => {
    const now = new Date();
    const hour = now.getHours(); // No offset needed
    const minutes = now.getMinutes();
    
    return hour * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  }, []);

  // Event handlers for drag and resize - using stable references with useCallback
  const startDrag = useCallback((event: React.MouseEvent, eventId: string, eventTop: number, eventHeight: number, dayIndex: number) => {
    event.stopPropagation();
    setDragMode('drag');
    setDraggedEventId(eventId);
    setDragStartPosition({
        mouseY: event.clientY,
        mouseX: event.clientX,
        eventTop: eventTop,
        eventHeight: eventHeight,
        dayIndex: dayIndex
    });
    setCurrentDragPosition({ 
        top: eventTop, 
        height: eventHeight,
        dayIndex: dayIndex
    });
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}, []);

  const startResizeTop = useCallback((event: React.MouseEvent, eventId: string, eventTop: number, eventHeight: number, dayIndex: number) => {
    event.stopPropagation();
    setDragMode('resize-top');
    setDraggedEventId(eventId);
    setDragStartPosition({
      mouseY: event.clientY,
      mouseX: event.clientX,
      eventTop: eventTop,
      eventHeight: eventHeight,
      dayIndex: dayIndex // Store the original day index
    });
    setCurrentDragPosition({ 
      top: eventTop, 
      height: eventHeight,
      dayIndex: dayIndex // Set to original day index to maintain the day
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const startResizeBottom = useCallback((event: React.MouseEvent, eventId: string, eventTop: number, eventHeight: number, dayIndex: number) => {
    event.stopPropagation();
    setDragMode('resize-bottom');
    setDraggedEventId(eventId);
    setDragStartPosition({
      mouseY: event.clientY,
      mouseX: event.clientX,
      eventTop: eventTop,
      eventHeight: eventHeight,
      dayIndex: dayIndex // Store the original day index
    });
    setCurrentDragPosition({ 
      top: eventTop, 
      height: eventHeight,
      dayIndex: dayIndex // Set to original day index to maintain the day
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Use a ref to store handler functions to break dependency cycles
  const handlerRefs = useRef({
    handleMouseMove: (event: MouseEvent) => {
      const { draggedEventId, dragMode, dragStartPosition } = handlerRefs.current.state;
      
      if (!draggedEventId || dragMode === 'none') return;
      
      const deltaY = event.clientY - dragStartPosition.mouseY;
      const deltaX = event.clientX - dragStartPosition.mouseX;
      
      if (dragMode === 'drag') {
        // When dragging, handle both vertical and horizontal movement
        const newTop = Math.max(0, dragStartPosition.eventTop + deltaY);
        // Make sure we don't drag past the bottom of the calendar (24-hour limit)
        const maxTop = 24 * HOUR_HEIGHT - dragStartPosition.eventHeight;
        const limitedTop = Math.min(newTop, maxTop);
        
        // Calculate horizontal movement in terms of days
        // Get the actual grid container width for more accurate calculations
        const gridContainer = document.querySelector('.grid-cols-8');
        let columnWidth = 100; // Default fallback
        
        if (gridContainer) {
          // Calculate the width of a single day column (subtract the time column width)
          const timeColumn = gridContainer.querySelector('div:first-child');
          const timeColumnWidth = timeColumn ? timeColumn.clientWidth : 0;
          const remainingWidth = gridContainer.clientWidth - timeColumnWidth;
          columnWidth = remainingWidth / 7; // 7 days
        }
        
        // Calculate day shift based on horizontal movement
        // Use a threshold to prevent accidental day changes
        const dayShiftRaw = deltaX / columnWidth;
        const dayShift = Math.abs(dayShiftRaw) > 0.5 ? Math.round(dayShiftRaw) : 0;
        const newDayIndex = Math.max(0, Math.min(6, dragStartPosition.dayIndex + dayShift));
        
        setCurrentDragPosition({
          top: limitedTop,
          height: dragStartPosition.eventHeight,
          dayIndex: newDayIndex
        });
      } else if (dragMode === 'resize-top') {
        // When resizing from top, adjust both top and height (inverse relationship)
        const newTop = Math.max(0, dragStartPosition.eventTop + deltaY);
        // Limit to not go below the bottom of the event minus minimum height
        const maxTop = dragStartPosition.eventTop + dragStartPosition.eventHeight - MIN_EVENT_HEIGHT;
        const limitedTop = Math.min(newTop, maxTop);
        
        // Adjust height accordingly to maintain the bottom position
        const newHeight = dragStartPosition.eventHeight - (limitedTop - dragStartPosition.eventTop);
        
        setCurrentDragPosition({
          top: limitedTop,
          height: newHeight,
          dayIndex: dragStartPosition.dayIndex // IMPORTANT: Keep the original day index for resize
        });
      } else if (dragMode === 'resize-bottom') {
        // When resizing from bottom, just adjust height
        const newHeight = Math.max(MIN_EVENT_HEIGHT, dragStartPosition.eventHeight + deltaY);
        // Limit height to not exceed calendar bottom (24 hour day)
        const maxHeight = 24 * HOUR_HEIGHT - dragStartPosition.eventTop;
        const limitedHeight = Math.min(newHeight, maxHeight);
        
        setCurrentDragPosition({
          top: dragStartPosition.eventTop,
          height: limitedHeight,
          dayIndex: dragStartPosition.dayIndex // IMPORTANT: Keep the original day index for resize
        });
      }
    },
    
    handleMouseUp: async () => {
      const { draggedEventId, dragMode, currentDragPosition, days, calendarEvents } = handlerRefs.current.state;
      
      if (!draggedEventId || dragMode === 'none') return;
      
      // Record the time of this drag/resize ending
      lastDragTime.current = Date.now();
      
      // Find the event
      const event = calendarEvents.find(e => e.id === draggedEventId);
      if (event) {
        // Get the original event date to maintain day during resize
        const eventDate = new Date(event.startTime);
        const originalDayIndex = days.findIndex(day => isSameDay(day, eventDate));
        
        // When resizing, we need to preserve the original day
        // When dragging, we use the currentDragPosition.dayIndex
        const targetDayIndex = (dragMode === 'resize-top' || dragMode === 'resize-bottom') 
          ? originalDayIndex
          : currentDragPosition.dayIndex;
        
        if (targetDayIndex !== -1) {
          // Get the target day
          const targetDay = days[targetDayIndex];
          
          // Convert position back to time, using the target day
          const times = positionToTime(
            currentDragPosition.top,
            currentDragPosition.height,
            targetDay
          );
          
          // Store the event ID before cleaning up
          const eventIdToUpdate = draggedEventId;
          
          // Reset all state immediately for better UI responsiveness
          setDragMode('none');
          setDraggedEventId(null);
          setCurrentDragPosition({ top: 0, height: 0, dayIndex: 0 });
          
          // Set due date to match end time
          const endTimeDate = new Date(times.endTime);
          const dueDate = endTimeDate.toISOString();
          
          try {
            // Check if the note exists
            if (!notes.some(note => note.id === eventIdToUpdate)) {
              throw new Error('Note not found for update');
            }
            
            // Update the event silently without waiting for response or showing validation errors
            updateCalendarEvent(eventIdToUpdate, times.startTime, times.endTime, dueDate)
              .catch(error => {
                console.error('Calendar update failed in background:', error);
              });
          } catch (error) {
            console.error('Failed to update event:', error);
            // Don't show any error to the user - let the operation continue
          }
          
          return;
        }
      }
      
      // If we didn't update an event, still reset the state completely
      setDragMode('none');
      setDraggedEventId(null);
      setCurrentDragPosition({ top: 0, height: 0, dayIndex: 0 });
    },
    
    // Store current state in ref to access in handlers
    state: {
      draggedEventId: null as string | null,
      dragMode: 'none' as 'none' | 'drag' | 'resize-top' | 'resize-bottom',
      dragStartPosition: { 
        mouseY: 0, 
        mouseX: 0, 
        eventTop: 0, 
        eventHeight: 0, 
        dayIndex: 0 
      },
      currentDragPosition: { 
        top: 0, 
        height: 0, 
        dayIndex: 0 
      },
      days: [] as Date[],
      calendarEvents: [] as CalendarEvent[]
    }
  });

  // Update state in ref when component state changes
  useEffect(() => {
    handlerRefs.current.state.draggedEventId = draggedEventId;
    handlerRefs.current.state.dragMode = dragMode;
    handlerRefs.current.state.dragStartPosition = dragStartPosition;
    handlerRefs.current.state.currentDragPosition = currentDragPosition;
    handlerRefs.current.state.days = days;
    handlerRefs.current.state.calendarEvents = calendarEvents;
  }, [draggedEventId, dragMode, dragStartPosition, currentDragPosition, days, calendarEvents]);

  // Create stable references to handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Only process mouse move if the left button is held down
    if (e.buttons === 0) {
      // If mouse button is released but we didn't catch the mouseup event
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Reset drag state
      setDragMode('none');
      setDraggedEventId(null);
      setCurrentDragPosition({ top: 0, height: 0, dayIndex: 0 });
      return;
    }
    
    handlerRefs.current.handleMouseMove(e);
  }, []);

  const handleMouseUp = useCallback(() => {
    // Remove event listeners immediately
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    // Reset drag state
    const wasDragging = dragMode !== 'none'; // Check if we were dragging or resizing
    setDragMode('none');
    setDraggedEventId(null);
    setCurrentDragPosition({ top: 0, height: 0, dayIndex: 0 });

    if (handlerRefs.current.handleMouseUp) {
        handlerRefs.current.handleMouseUp();
    }

    // If we were dragging or resizing, prevent the edit dialog from opening
    if (wasDragging) {
        console.log('Drag or resize completed, not opening edit dialog.');
        return;
    }
  }, [handleMouseMove]);

  // Clean up event listeners when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    const newDate = addDays(startDate, -7);
    setStartDate(newDate);
  }, [startDate]);

  const goToNextWeek = useCallback(() => {
    const newDate = addDays(startDate, 7);
    setStartDate(newDate);
  }, [startDate]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setStartDate(today); // Set to today directly, not start of week
    setTimeout(scrollToCurrentTime, 100);
  }, [scrollToCurrentTime]);

  // Add a state for the copied event
  const [copiedEvent, setCopiedEvent] = useState<CalendarEvent | null>(null);
  
  // Add function for copying events
  const handleCopyEvent = useCallback((event: CalendarEvent) => {
    setCopiedEvent(event);
    toast.success('Event copied to clipboard');
  }, []);

  // Add function for pasting events
  const handlePasteEvent = useCallback((targetDay: Date) => {
    if (!copiedEvent) {
      toast.error('No event in clipboard');
      return;
    }
    
    // Calculate duration of original event
    const originalDuration = new Date(copiedEvent.endTime).getTime() - new Date(copiedEvent.startTime).getTime();
    
    // Create a new start time on the target day (same time of day)
    const originalStart = new Date(copiedEvent.startTime);
    const newStartTime = new Date(targetDay);
    newStartTime.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
    
    // Set the end time based on original duration
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);
    
    // Create a new event
    const newEvent = {
      content: copiedEvent.content,
      category: copiedEvent.category,
      timestamp: Date.now(),
      isTask: copiedEvent.isTask,
      priority: copiedEvent.priority,
      dueDate: newEndTime.toISOString(),
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(), 
      completed: false,
      labels: copiedEvent.labels || [],
      color: copiedEvent.color
    };
    
    // Create the new event using the NotesProvider - without waiting for validation
    createNote(newEvent as any)
      .then(() => {
        toast.success('Event pasted');
      })
      .catch(error => {
        console.error('Failed to paste event:', error);
        // Still show toast but don't block UI
        toast.error('Failed to paste event');
      });
  }, [copiedEvent, createNote]);
  
  // Cell click handler - opens the dialog for creating a new event
  const handleCellClick = useCallback((day: Date, hour: number) => {
    // Don't open the dialog if we have a copied event (allow pasting)
    if (copiedEvent) {
      handlePasteEvent(day);
      return;
    }
    
    // Calculate start and end times (1 hour duration by default)
    const startTime = new Date(day);
    startTime.setHours(hour, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);
    
    // Initialize form data for a new event
    setEventData({
      id: '',
      content: '',
      startTime: format(startTime, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(endTime, "yyyy-MM-dd'T'HH:mm"),
      category: 'Calendar',
      priority: 'medium',
      labels: [],
      color: getRandomColor(), // Only generate random color for new events
    });
    
    setIsEditMode(false);
    openDialog(true);
  }, [openDialog, copiedEvent, handlePasteEvent]);

  // Event click handler - opens the dialog for editing
  const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    // Prevent propagation to avoid also creating a new event
    e.stopPropagation();
    
    // Reset drag state if it was previously set
    if (dragMode !== 'none') {
        setDragMode('none');
        setDraggedEventId(null);
        setCurrentDragPosition({ top: 0, height: 0, dayIndex: 0 });
    }

    // Only handle clicks, not drag operations
    console.log('Opening edit dialog for event:', event.id);
    
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    
    // Convert to form data
    setEventData({
        id: event.id,
        content: event.content,
        startTime: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        category: event.category,
        priority: event.priority || 'medium',
        labels: event.labels || [],
        color: event.color || getRandomColor(),
    });
    
    setIsEditMode(true);
    openDialog(true); // Ensure the dialog opens
  }, [dragMode, openDialog]);

  // Handle event save
  const handleSaveEvent = useCallback(async () => {
    if (!eventData.content.trim()) {
      toast.error('Event title cannot be empty');
      return;
    }

    try {
      closeDialog();
      
      // Prepare event data for saving
      const eventToSave: Partial<Note> = {
        content: eventData.content,
        category: eventData.category || 'Calendar',
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        priority: eventData.priority as Priority,
        dueDate: eventData.endTime, // Set due date to match end time
        isTask: true,
        labels: eventData.labels || [],
      };
      
      if (isEditMode && eventData.id) {
        // When editing, preserve the existing color and only update if explicitly changed
        eventToSave.color = eventData.color;
        
        // Update existing event
        await updateNote(eventData.id, eventToSave);
        toast.success('Event updated successfully');
      } else {
        // For new events, always set a color (either selected or random)
        const newColor = eventData.color || getRandomColor();
        
        // Create new event with all required properties
        await createNote({
          content: eventData.content,
          category: eventData.category || 'Calendar',
          timestamp: Date.now(),
          isTask: true,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          priority: eventData.priority as Priority,
          dueDate: eventData.endTime,
          labels: eventData.labels || [],
          color: newColor
        } as any); // Use type assertion to bypass TypeScript check for the color property
        toast.success('Event created successfully');
      }

      // Reset edit mode
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  }, [eventData, isEditMode, closeDialog, updateNote, createNote]);

  // Handle event deletion
  const handleDeleteEvent = useCallback(async () => {
    if (isEditMode && eventData.id) {
      try {
        closeDialog();
        await deleteNote(eventData.id);
        toast.success('Event deleted successfully');
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event');
      }
    }
  }, [isEditMode, eventData.id, closeDialog, deleteNote]);

  // Handle label management
  const addLabel = useCallback(() => {
    if (newLabelInput.trim() && !eventData.labels.includes(newLabelInput.trim())) {
      setEventData(prev => ({
        ...prev,
        labels: [...prev.labels, newLabelInput.trim()]
      }));
      setNewLabelInput('');
    }
  }, [newLabelInput, eventData.labels]);

  const removeLabel = useCallback((label: string) => {
    setEventData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label)
    }));
  }, []);

  // Tag filtering helpers
  const getTopTags = useCallback((count: number): string[] => {
    // Count occurrences of each tag across all events
    const tagCounts: Record<string, number> = {};
    
    calendarEvents.forEach(event => {
      if (event.labels && event.labels.length > 0) {
        event.labels.forEach(label => {
          tagCounts[label] = (tagCounts[label] || 0) + 1;
        });
      }
    });
    
    // Sort tags by count and take the top 'count' tags
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([tag]) => tag);
  }, [calendarEvents]);

  const toggleTagFilter = useCallback((tag: string) => {
    setActiveTagFilters(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  }, []);

  // Add keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in an input field
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Check for copy (Ctrl+C or Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && draggedEventId) {
        const eventToCopy = calendarEvents.find(evt => evt.id === draggedEventId);
        if (eventToCopy) {
          handleCopyEvent(eventToCopy);
          e.preventDefault();
        }
      }
      
      // Check for paste (Ctrl+V or Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedEvent) {
        // Find today in the calendar view
        const today = new Date();
        const closestDay = days.find(d => isSameDay(d, today)) || days[0];
        handlePasteEvent(closestDay);
        e.preventDefault();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [draggedEventId, calendarEvents, copiedEvent, days, handleCopyEvent, handlePasteEvent]);

  // Render events for a given day
  const renderEvents = useCallback((day: Date, dayIndex: number) => {
    let dayEvents = calendarEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, day);
    });
    
    // Apply tag filtering if active
    if (activeTagFilters.length > 0) {
      dayEvents = dayEvents.filter(event => 
        event.labels && event.labels.some(label => activeTagFilters.includes(label))
      );
    }

    // Add ghost event for dragging visualization
    if (dragMode === 'drag' && draggedEventId) {
      const draggedEvent = calendarEvents.find(e => e.id === draggedEventId);
      if (draggedEvent && dayIndex === currentDragPosition.dayIndex) {
        // If this is the target day column, make sure the event is included
        if (!dayEvents.some(e => e.id === draggedEventId)) {
          dayEvents = [...dayEvents, draggedEvent];
        }
      }
    }

    return dayEvents.map((event) => {
      // Calculate position and dimensions
      const { top, height } = calculateEventStyle(event.startTime, event.endTime);
      
      // Apply any active drag or resize transformations
      const isBeingModified = draggedEventId === event.id;
      
      // Check if this is the original event that's being dragged to another column
      const isOriginalBeingDragged = isBeingModified && dragMode === 'drag';
      const eventDate = new Date(event.startTime);
      const isInOriginalDay = isSameDay(eventDate, day);
      const isInTargetDay = dayIndex === currentDragPosition.dayIndex;
      
      // If this is the original event being dragged and we're not in the target day,
      // show a ghost version with reduced opacity
      if (isOriginalBeingDragged && isInOriginalDay && !isInTargetDay) {
        // Show ghost version in original position with reduced opacity
        const displayTop = top;
        const displayHeight = height;
        
        // Choose priority color
        const eventColor = getEventColor(event);
        
        return (
          <div
            id={`event-ghost-${event.id}`}
            key={`ghost-${event.id}`}
            style={{
              position: 'absolute',
              top: `${displayTop}px`,
              left: '4px',
              right: '4px',
              height: `${displayHeight}px`,
              zIndex: 0,
            }}
            className={cn(
              "rounded-md p-1 overflow-hidden flex flex-col justify-between",
              "border-dashed border-2 shadow-sm",
              // Enhanced ghost styling with more visible colors based on priority
              eventColor.replace('bg-', 'bg-opacity-20 bg-').replace('hover:bg-', 'hover:bg-opacity-30 hover:bg-'),
              "opacity-60 pointer-events-none select-none" // Increased from opacity-50 to opacity-60
            )}
          >
            <div className="text-xs font-medium truncate flex-grow">
              {event.content}
            </div>
            {displayHeight >= 30 && (
              <div className="text-xs opacity-90 truncate select-none">
                {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
              </div>
            )}
          </div>
        );
      }
      
      // If this event is being dragged, check if it should be rendered in this day column
      if (isBeingModified && dragMode === 'drag' && !isInTargetDay) {
        return null; // Don't render the actual event in non-target columns
      }
      
      const displayTop = isBeingModified ? currentDragPosition.top : top;
      const displayHeight = isBeingModified ? currentDragPosition.height : height;
      
      // Choose priority color
      const eventColor = getEventColor(event);
      
      // Determine if event is short (less than 30 minutes)
      const isShortEvent = displayHeight < 30;
      
      return (
        <div
          id={`event-${event.id}`}
          key={event.id}
          style={{
            position: 'absolute',
            top: `${displayTop}px`,
            left: '4px',
            right: '4px',
            height: `${displayHeight}px`,
            zIndex: isBeingModified ? 10 : 1,
          }}
          className={cn(
            "rounded-md p-1 overflow-hidden flex flex-col justify-between",
            "border shadow-sm cursor-move select-none", // Added select-none to prevent text selection
            eventColor,
            isBeingModified ? "opacity-90 shadow-lg ring-2 ring-primary/50" : "opacity-95 hover:shadow-md",
            "hover:opacity-100 transition-all duration-150"
          )}
          onClick={(e) => {
            // Only handle clicks when not in drag mode
            if (dragMode === 'none') {
              handleEventClick(event, e);
            }
          }}
          onMouseDown={(e) => {
            // Prevent dragging from resize handles (they have their own handlers)
            const target = e.target as HTMLElement;
            if (dragMode === 'none' && 
                !target.classList.contains('cursor-n-resize') && 
                !target.classList.contains('cursor-s-resize')) {
              startDrag(e, event.id, displayTop, displayHeight, dayIndex);
            }
          }}
        >
          {/* Event content area - added context menu */}
          <div className="flex items-start justify-between">
            <div className="text-xs font-medium truncate flex-grow select-none">
              {event.content}
            </div>
            
            {/* Add dropdown menu for copy/paste */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-4 w-4 opacity-50 hover:opacity-100 -mt-1 -mr-1">
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleCopyEvent(event)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy (Ctrl+C)
                </DropdownMenuItem>
                {copiedEvent && (
                  <DropdownMenuItem onClick={() => handlePasteEvent(day)}>
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    Paste (Ctrl+V)
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => deleteNote(event.id)}>
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                  <span className="text-destructive">Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Time display - hide on very short events */}
          {!isShortEvent && (
            <div className="text-xs opacity-90 truncate select-none">
              {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
            </div>
          )}
          
          {/* Tags display - only show on events with enough height */}
          {!isShortEvent && event.labels && event.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 max-w-full overflow-hidden">
              {event.labels.slice(0, 3).map((label, idx) => (
                <span 
                  key={idx} 
                  className="inline-block px-1.5 py-0.5 bg-black/20 text-[10px] rounded-sm truncate max-w-[40%] select-none"
                  title={label}
                >
                  {label}
                </span>
              ))}
              {event.labels.length > 3 && (
                <span className="inline-block px-1 text-[10px] opacity-80 select-none">+{event.labels.length - 3}</span>
              )}
            </div>
          )}
          
          {/* Top resize handle */}
          <div
            className="absolute top-0 left-0 w-full h-2 cursor-n-resize hover:bg-black/20 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent parent's onMouseDown from firing
              if (dragMode === 'none') {
                startResizeTop(e, event.id, displayTop, displayHeight, dayIndex);
              }
            }}
          />
          
          {/* Bottom resize handle */}
          <div
            className="absolute bottom-0 left-0 w-full h-2 cursor-s-resize hover:bg-black/20 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent parent's onMouseDown from firing
              if (dragMode === 'none') {
                startResizeBottom(e, event.id, displayTop, displayHeight, dayIndex);
              }
            }}
          />
        </div>
      );
    }).filter(Boolean); // Filter out null values
  }, [calendarEvents, activeTagFilters, draggedEventId, currentDragPosition, dragMode, handleEventClick, startDrag, startResizeTop, startResizeBottom, days, handleCopyEvent, handlePasteEvent, copiedEvent, deleteNote]);

  // Get event color based on event priority
  const getEventColor = (event: CalendarEvent) => {
    // If event has a custom color, use it
    if (event.color && eventColors[event.color as EventColor]) {
      return eventColors[event.color as EventColor];
    }
    
    // Fall back to priority color if no custom color
    return event.priority ? priorityColors[event.priority] : priorityColors.optional;
  };

  // The rendered component
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Calendar header - redesigned */}
      <div className="flex flex-col p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className='px-4' onClick={goToPreviousWeek}>
              <MoveLeft className="h-5 w-5 " /> 
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="sm" className='px-4' onClick={goToNextWeek}>
              <MoveRight className="h-5 w-5 " />
            </Button>
          </div>
          
          {/* Tag filters - moved to the same row */}
          <div className="flex items-center gap-2">
            {getTopTags(5).length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filter:</span>
                <div className="flex flex-wrap gap-1">
                  {getTopTags(5).map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant={activeTagFilters.includes(tag) ? "default" : "outline"} 
                      className={cn(
                        "cursor-pointer transition-colors",
                        activeTagFilters.includes(tag) 
                          ? "bg-primary hover:bg-primary/90" 
                          : "hover:bg-primary/10"
                      )}
                      onClick={() => toggleTagFilter(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {activeTagFilters.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs px-2" 
                      onClick={() => setActiveTagFilters([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-2 text-center border-r text-sm font-medium">Time</div>
        {days.map((day, index) => (
          <div 
            key={index} 
            className={cn(
              "p-2 text-center border-r text-sm font-medium",
              isToday(day) && "bg-primary/10"
            )}
          >
            <div>{DAYS_OF_WEEK[day.getDay()]}</div>
            <div className={cn(
              "text-xs",
              isToday(day) ? "text-primary font-semibold" : "text-muted-foreground"
            )}>
              {format(day, 'MMM d')}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto" ref={containerRef}>
        <div className="relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
          {/* Hour labels */}
          <div className="grid grid-cols-8 h-full">
            <div className="border-r">
              {HOURS.map((hour, idx) => (
                <div 
                  key={idx} 
                  className="border-b text-xs text-muted-foreground text-center"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>
            
            {/* Calendar cells */}
            {days.map((day, dayIndex) => (
              <div 
                key={dayIndex} 
                className={cn(
                  "border-r relative",
                  isToday(day) && "bg-primary/2", // Lighter background for today
                  // Highlight the target day column during dragging with a translucent indicator
                  dragMode === 'drag' && dayIndex === currentDragPosition.dayIndex && "bg-primary/10 border-l-2 border-primary/30"
                )}
              >
                {HOURS.map((hour, hourIndex) => (
                  <div
                    key={hourIndex}
                    className={cn(
                      "border-b",
                      isToday(day) && "bg-primary/5" // Lighter background for today's cells
                    )}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onClick={() => handleCellClick(day, hour)}
                  ></div>
                ))}
                
                {/* Render events for this day */}
                {renderEvents(day, dayIndex)}
                
                {/* Current time indicator */}
                {isToday(day) && (
                  <div 
                    ref={isToday(day) ? currentTimeRef : null}
                    className="absolute left-0 right-0 z-10 border-t-2 border-red-500"
                    style={{ 
                      top: `${getCurrentTimePosition()}px` 
                    }}
                  >
                    <div className="absolute -left-1 -top-1.5 w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Dialog - completely controlled internally */}
      <Dialog 
        open={internalDialogOpen} 
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md bg-card rounded-xl shadow-lg border-0">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              {isEditMode ? 'Edit Calendar Event' : 'Create Calendar Event'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="eventTitle" className="text-sm font-medium flex items-center gap-1">
                <span className="text-primary">Event Title</span>
              </label>
              <Textarea
                id="eventTitle"
                placeholder="What's your event about?"
                value={eventData.content}
                onChange={(e) => setEventData(prev => ({ ...prev, content: e.target.value }))}
                className="min-h-[80px] resize-none focus:ring-2 focus:ring-primary/50 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="startTime" className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary">Start Time</span>
                </label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={eventData.startTime.slice(0, 16)}
                  onChange={(e) => setEventData(prev => ({
                    ...prev,
                    startTime: new Date(e.target.value).toISOString()
                  }))}
                  className="focus:ring-2 focus:ring-primary/50 rounded-lg"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="endTime" className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary">End Time</span>
                </label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={eventData.endTime.slice(0, 16)}
                  onChange={(e) => setEventData(prev => ({
                    ...prev,
                    endTime: new Date(e.target.value).toISOString()
                  }))}
                  className="focus:ring-2 focus:ring-primary/50 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="category" className="text-sm font-medium flex items-center gap-1">
                  <Layout className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary">Category</span>
                </label>
                <Input
                  id="category"
                  placeholder="Category"
                  value={eventData.category}
                  onChange={(e) => setEventData(prev => ({ ...prev, category: e.target.value }))}
                  className="focus:ring-2 focus:ring-primary/50 rounded-lg"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="priority" className="text-sm font-medium flex items-center gap-1">
                  <Flag className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary">Priority</span>
                </label>
                <select
                  id="priority"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                  value={eventData.priority}
                  onChange={(e) => setEventData(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="optional">Optional</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            
            {/* Labels/Tags section */}
            <div className="grid gap-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Tags className="h-3.5 w-3.5 text-primary" /> 
                <span className="text-primary">Labels/Tags</span>
              </label>
              
              <div className="flex flex-wrap gap-1 mb-2 min-h-[30px] p-2 border rounded-lg border-primary/30 bg-background/50">
                {eventData.labels.map((label, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 rounded-full px-3 py-1 bg-primary/10 text-primary">
                    {label}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLabel(label);
                      }}
                      className="w-4 h-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/40 inline-flex items-center justify-center text-xs ml-1"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add a label (e.g. #work, #important)"
                  value={newLabelInput}
                  onChange={(e) => setNewLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLabel();
                    }
                  }}
                  className="focus:ring-2 focus:ring-primary/50 rounded-lg"
                />
                <Button type="button" onClick={addLabel} size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10 rounded-lg">
                  Add
                </Button>
              </div>
            </div>
            
            {/* Add color selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Color</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(eventColors).map(([colorName, colorClass]) => {
                  const isSelected = eventData.color === colorName;
                  return (
                    <button
                      key={colorName}
                      type="button"
                      onClick={() => setEventData(prev => ({ ...prev, color: colorName }))}
                      className={cn(
                        "w-6 h-6 rounded-full border",
                        colorClass.split(' ')[0], // Use just the background color
                        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
                      )}
                      aria-label={`Select ${colorName} color`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between border-t pt-3">
            <div>
              {isEditMode && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteEvent}
                  size="sm"
                  className="hover:bg-destructive/90 rounded-lg"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog} className="rounded-lg">
                Cancel
              </Button>
              <Button onClick={handleSaveEvent} className="bg-primary hover:bg-primary/90 rounded-lg">
                {isEditMode ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 