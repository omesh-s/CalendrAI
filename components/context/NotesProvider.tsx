"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/libs/api';
import { Priority } from '@/libs/constants';
import { Cache } from '@/libs/cache'; // Import the Cache utility
import { toast } from 'sonner';
import { timeStamp } from 'console';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';

interface Note {
  id: string;
  content: string;
  category: string;
  timestamp: number;
  isTask: boolean;
  completed?: boolean;
  completedAt?: string;
  priority?: Priority;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  labels?: string[];
  subtasks?: {
    id: string;
    parentId: string;
    content: string;
    completed?: boolean;
    completedAt?: string;
    priority?: Priority;
    estimatedTime?: string;
  }[];
}

// Define the types of changes we can make
type ChangeType = 'create' | 'update' | 'delete' | 'updateCategory';

interface PendingChange {
  type: ChangeType;
  timestamp: number;
  payload: any;
}

interface NotesContextType {
  notes: Note[];
  isLoading: boolean;
  hasMore: boolean;
  loadMoreNotes: () => void;
  createNote: (note: Omit<Note, 'id'>) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  deleteAllNotes: () => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note>;
  updateCategoryName: (oldName: string, newName: string) => Promise<void>;
  searchNotes: (query: string) => Promise<Note[]>;
  clearCache: () => Promise<void>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  updateCalendarEvent: (id: string, startTime: string, endTime: string, dueDate?: string) => Promise<Note>;
  getTasksByDateRange: (startDate: string, endDate: string) => Promise<Note[]>;
}

const NotesContext = createContext<NotesContextType | null>(null);

// Add debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const { data: session } = useSession();
  const [hasFetched, setHasFetched] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 4 hours
  const updateTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Clean up any pending timeouts when the component unmounts
  useEffect(() => {
    return () => {
      // Clear all update timeouts
      Object.values(updateTimeoutsRef.current).forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      // Clear the timeouts object
      updateTimeoutsRef.current = {};
    };
  }, []);

  // Add fetchNotes function with pagination
  const fetchNotes = useCallback(async (limit: number = 50, startAfter?: number) => {
    if (!session?.user?.id) return;
    console.log("session ",session)
    setIsLoading(true);
    try {
      const response = await apiClient.get('/user/get-notes', {
        params: {
          limit,
          startAfter: startAfter || undefined,
        },
      });
      console.log("LIMIT ",response)
      console.log("fetched ",response.data.notes)
      const fetchedNotes: Note[] = response.data.notes;
      if (fetchedNotes.length < limit) {
        console.log("Setting false 2")
        setHasMore(false);
      }
      
      // Update local state
      setNotes(prev => [...prev, ...fetchedNotes]);

      // Update cache
      await Cache.addNotes(fetchedNotes);

      // Update lastTimestamp
      if (fetchedNotes.length > 0) {
        setLastTimestamp(fetchedNotes[fetchedNotes.length - 1].timestamp);
      }

      // Update cache timestamp
      const currentTime = Date.now();
      await Cache.setCacheTimestamp(currentTime);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to fetch notes.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Initial load: check cache first
  const initialLoad = useCallback(async () => {
    if (!session?.user?.id) return;

    setHasMore(true);
    const cacheTimestamp = await Cache.getCacheTimestamp();
    const currentTime = Date.now();

    if (cacheTimestamp && (currentTime - cacheTimestamp) < CACHE_EXPIRY_MS) {
      // Load from cache
      const cachedNotes = await Cache.getAllNotes(1000); // Adjust the limit as needed
      setNotes(cachedNotes);
      if (cachedNotes.length <= 1000 && cachedNotes.length>0) {
        setHasMore(true);
        console.log("Fetched notes ",cachedNotes)
        setLastTimestamp(cachedNotes[0].timestamp);
      } else {
        console.log("Setting false 1 ")
        setHasMore(false);
      }
      setIsLoading(false);
      setHasFetched(true);
    } else {
      // Cache expired or not present, clear cache and fetch from Firestore
      await Cache.clearCache();
      await fetchNotes();
      setHasFetched(true);
    }
  }, [session?.user?.id, fetchNotes]);

  useEffect(() => {
    if (session?.user?.id && !hasFetched) {
      initialLoad();
    }
  }, [session?.user?.id, initialLoad, hasFetched]);

  // Function to sync changes with backend
  const syncWithBackend = useCallback(async () => {
    if (pendingChanges.length === 0) return;

    const changes = [...pendingChanges];
    setPendingChanges([]); // Clear the queue

    try {
      // Process changes in order
      for (const change of changes) {
        switch (change.type) {
          case 'create':
            await apiClient.post('/user/create-note', change.payload);
            // toast.success('Note created successfully.');
            break;
          case 'update':
            await apiClient.patch('/user/update-note', change.payload);
            // toast.success('Note updated successfully.');
            break;
          case 'delete':
            await apiClient.post('/user/delete-note', change.payload);
            // toast.success('Note deleted successfully.');
            break;
          case 'updateCategory':
            await apiClient.post('/user/update-category', change.payload);
            // toast.success('Category updated successfully.');
            break;
        }
      }

      console.log("Sync completed successfully.");
    } catch (error) {
      console.error('Error syncing with backend:', error);
      // If sync fails, add changes back to queue
      setPendingChanges(prev => [...prev, ...changes]);
      toast.error('Failed to sync changes. They have been re-queued.');
    }
  }, [pendingChanges]);

  // Set up periodic sync
  useEffect(() => {
    const syncInterval = setInterval(syncWithBackend, 8000); // Sync every 8 seconds
    return () => clearInterval(syncInterval);
  }, [syncWithBackend]);

  // Functions to handle CRUD operations
  const createNote = async (note: Omit<Note, 'id'>): Promise<Note> => {
    try {
      const response = await apiClient.post('/user/create-note', note);
      const newNote: Note = response.data.note;

      // Update state and cache
      setNotes(prev => [newNote, ...prev]);
      await Cache.addNote(newNote);

      return newNote;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  };

  const deleteNote = async (id: string) => {
    // Update state and cache
    setNotes(prev => prev.filter(note => note.id !== id));
    await Cache.deleteNote(id);

    // Add to pending changes
    setPendingChanges(prev => [...prev, {
      type: 'delete',
      timestamp: Date.now(),
      payload: { id }
    }]);
  };

  const updateNote = async (id: string, updates: Partial<Note>): Promise<Note> => {
    try {
      // Find the note to update
      const noteToUpdate = notes.find(note => note.id === id);
      
      if (!noteToUpdate) {
        console.error('Note not found for update:', id);
        throw new Error('Note not found');
      }
      
      // Create an optimistically updated note
      const updatedNote = { ...noteToUpdate, ...updates };
      
      // Create a timestamp for this update to track its order
      const updateTimestamp = Date.now();
      
      // Optimistically update state and cache - wrap in our own state updater
      // to ensure we're working with the latest state
      setNotes(prevNotes => {
        const newNotes = prevNotes.map(note => 
          note.id === id ? updatedNote : note
        );
        
        // Update cache with the new state
        Cache.updateNote(id, updates).catch(err => 
          console.error('Error updating note in cache:', err)
        );
        
        return newNotes;
      });

      // Add to pending changes
      setPendingChanges(prev => [...prev, {
        type: 'update',
        timestamp: updateTimestamp,
        payload: { id, updates }
      }]);

      // Return the updated note immediately for UI responsiveness
      return updatedNote;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  };

  const updateCategoryName = async (oldName: string, newName: string) => {
    try {
      // Optimistically update state and cache
      setNotes(prev => prev.map(note => note.category === oldName ? { ...note, category: newName } : note));
      // Fetch all affected notes from cache and update them
      const allNotes = await Cache.getAllNotes(1000); // Adjust as needed
      const updatedNotes = allNotes.map(note => note.category === oldName ? { ...note, category: newName } : note);
      await Cache.clearCache();
      await Cache.addNotes(updatedNotes);

      // Add to pending changes
      setPendingChanges(prev => [...prev, {
        type: 'updateCategory',
        timestamp: Date.now(),
        payload: { oldName, newName }
      }]);

      toast.success(`Category updated from "${oldName}" to "${newName}".`);
    } catch (error) {
      console.error('Error updating category name:', error);
      throw error;
    }
  };

  const searchNotes = async (query: string): Promise<Note[]> => {
    if (!session?.user?.id) return [];

    try {
      const response = await apiClient.get('/user/search-notes', {
        params: { query },
      });

      const foundNotes: Note[] = response.data.notes;

      // Update cache with search results
      await Cache.addNotes(foundNotes);

      // Update state
      setNotes(prev => {
        // Avoid duplicates
        const existingIds = new Set(prev.map(note => note.id));
        const newNotes = foundNotes.filter(note => !existingIds.has(note.id));
        return [...prev, ...newNotes];
      });

      return foundNotes;
    } catch (error) {
      console.error('Error searching notes:', error);
      toast.error('Search failed.');
      return [];
    }
  };

  const loadMoreNotes = async () => {
    if (isLoading || !hasMore) return;
    console.log("last timestamp ",lastTimestamp)
    await fetchNotes(50, lastTimestamp);
  };

  const clearCacheHandler = async () => {
    await Cache.clearCache();
    setNotes([]);
    setHasMore(true);
    setLastTimestamp(null);
    await fetchNotes();
  };

  // Add deleteAllNotes function
  const deleteAllNotes = async () => {
    setNotes([]); // Clear all notes
    await Cache.clearCache(); // Clear cache as well
    setHasMore(true); // Reset hasMore state
    setLastTimestamp(null); // Reset lastTimestamp
  };

  // Export setNotes function
  const setNotesHandler = (newNotes: Note[]) => {
    setNotes(newNotes);
  };

  // Add these functions within the NotesProvider component
  const updateCalendarEvent = async (id: string, startTime: string, endTime: string, dueDate?: string): Promise<Note> => {
    try {
      // First check if the note exists in our local state
      const noteToUpdate = notes.find(note => note.id === id);
      
      if (!noteToUpdate) {
        console.error('Note not found in current state:', id);
        throw new Error('Note not found');
      }
      
      // Create update data
      const updateData: Partial<Note> = {
        startTime,
        endTime
      };
      
      // Add dueDate to update data if provided
      if (dueDate) {
        updateData.dueDate = dueDate;
      }
      
      // ENSURE IMMEDIATE UI UPDATE - Create updated note
      const updatedNote = { ...noteToUpdate, ...updateData };
      
      // Update state IMMEDIATELY for instant UI feedback
      setNotes(prevNotes => 
        prevNotes.map(note => note.id === id ? updatedNote : note)
      );
      
      // Also update the cache immediately
      await Cache.updateNote(id, updateData).catch(err => 
        console.error('Error updating note in cache:', err)
      );
      
      console.log(`Updating calendar event for ${id} with data:`, updateData);
      
      // DEBOUNCE SERVER UPDATE - Add to pending changes with debounce handling
      // Use a unique key for this note's update
      const updateKey = `calendar_update_${id}`;
      
      // Clear any existing timeout for this note
      if (updateTimeoutsRef.current[updateKey]) {
        clearTimeout(updateTimeoutsRef.current[updateKey]);
        delete updateTimeoutsRef.current[updateKey];
      }
      
      // Set a new timeout for the server update
      updateTimeoutsRef.current[updateKey] = setTimeout(() => {
        // Remove from timeouts
        delete updateTimeoutsRef.current[updateKey];
        
        // Add to pending changes for server sync
        setPendingChanges(prev => [...prev, {
          type: 'update',
          timestamp: Date.now(),
          payload: { id, updates: updateData }
        }]);
      }, 300); // 300ms debounce
      
      // Return the updated note immediately for UI responsiveness
      return updatedNote;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  };

  // Add a function to filter tasks by date range for the calendar view
  const getTasksByDateRange = async (startDate: string, endDate: string): Promise<Note[]> => {
    try {
      // This is an optimized version that filters locally if the data is already in the state
      // You can make this a server query for better performance with large datasets
      const filteredNotes = notes.filter(note => {
        // Include notes with startTime or dueDate in the range
        const noteStart = note.startTime || note.dueDate;
        if (!noteStart) return false;
        
        const noteDate = new Date(noteStart);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        
        return noteDate >= rangeStart && noteDate <= rangeEnd;
      });
      
      return filteredNotes;
    } catch (error) {
      console.error('Error getting tasks by date range:', error);
      return [];
    }
  };

  return (
    <NotesContext.Provider value={{
      notes,
      isLoading,
      hasMore,
      loadMoreNotes,
      createNote,
      deleteNote,
      deleteAllNotes,
      updateNote,
      updateCategoryName,
      searchNotes,
      clearCache: clearCacheHandler,
      setNotes: setNotesHandler,
      updateCalendarEvent,
      getTasksByDateRange,
    }}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}; 