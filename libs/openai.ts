import apiClient from './api';
import { 
  CategorizeOptions, 
  SubTask, 
  ExtendedCategoryResponse,
  CategoryResponse,
  ClarificationResponse
} from '@/types';

interface CrumbleResponse {
  subtasks: SubTask[];
  tokensUsed: number;
  creditsUsed: number;
}

interface BreakdownItem {
  content: string;
  type: 'task' | 'note';
  subtasks?: {
    content: string;
    estimatedTime?: string;
    priority?: string;
  }[];
}

interface BreakdownResponse {
  items: {
    content: string;
    type: 'task' | 'note';
    category: string;
    priority: 'optional' | 'low' | 'medium' | 'high' | 'critical';
    suggestedDueDate: string | null;
    completed: boolean;
    completedAt: string | null;
    subtasks?: {
      content: string;
      estimatedTime?: string;
      priority?: 'optional' | 'low' | 'medium' | 'high' | 'critical';
      completed: boolean;
    }[];
  }[];
  tokensUsed: number;
  creditsUsed: number;
}

interface TaskCheckResponse {
  isTask: boolean;
  tokensUsed: number;
  creditsUsed: number;
}

interface CategorizeNoteResponse {
  results: ExtendedCategoryResponse[];
  tokensUsed: number;
  creditsUsed: number;
}

// Define types for task data
export interface Task {
  id?: string;
  content: string;
  category: string;
  timestamp?: number;
  isTask: boolean;
  priority?: 'optional' | 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  completed?: boolean;
  completedAt?: string | null;
}

// Define ActionResult interface for the agent response
export interface ActionResult {
  action: string;
  data: any;
  message?: string;
}

// Define NotesContext type for use in multiple functions
interface NotesContext {
  createNote: (note: Omit<Task, 'id'>) => Promise<Task>;
  updateNote: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteNote: (id: string) => Promise<void>;
}

// Define a type for the expected AI response
interface AIResponse {
  action: string;
  data: any; // You can further specify this type based on your actual data structure
  tokensUsed: number;
}

// Add a type for the conversation-capable API response
interface AgentResponse {
  actions: ActionResult[];
  messages: string[];
  tokensUsed: number;
  creditsUsed: number;
  conversationId: string;
}

/**
 * Process user input through the AI agent
 * @param input User's input text
 * @param existingCategories Array of existing categories
 * @param notesContext An object with functions from NotesProvider for persistence
 * @returns Response from the AI agent with action and data
 */
export async function processWithAgent(
  input: string, 
  existingCategories: string[] = [],
  notesContext: NotesContext | null = null,
  cachedNotes: Task[] = [],
  conversationId?: string
) {
  try {
    console.log('🤖 AI Agent processing:', input.substring(0, 50) + (input.length > 50 ? '...' : ''));
    
    const response = await apiClient.post('/ai', {
      input,
      existingCategories,
      cachedTasks: cachedNotes,
      conversationId
    });

    if (!response || !response.data) {
      console.error('Empty response from AI agent');
      throw new Error('Empty response received from AI service');
    }
    
    // Log the full response for debugging
    console.log("Response from AI service:", JSON.stringify(response.data, null, 2));
    
    // Handle different response formats
    // The response might be nested under data or directly in the response
    const responseData = response.data.data || response.data;
    
    // Log the extracted data for debugging
    console.log('🔍 Extracted data:', { 
      actionsCount: responseData.actions?.length || 0, 
      messagesCount: responseData.messages?.length || 0,
      tokensUsed: responseData.tokensUsed || 0,
      conversationId: responseData.conversationId
    });
    
    return responseData;
  } catch (error) {
    console.error('❌ Error calling AI agent:', error);
    throw error;
  }
}




// Keep these functions for backward compatibility, but update them to use the agent
export async function categorizeNote(
  content: string, 
  existingCategories: string[] = [], 
  options: CategorizeOptions = {},
  notesContext: NotesContext | null = null,
  cachedNotes: Task[] = [],
  conversationId?: string
) {
  try {
    console.log('🔍 Categorizing note:', content.substring(0, 50) + (content.length > 50 ? '...' : ''));
    
    // Call the agent with cached notes and conversation ID
    const response = await apiClient.post('/ai', {
      input: content,
      existingCategories,
      cachedTasks: cachedNotes,
      conversationId
    });
    
    console.log("AI response1:", response);
    
    if (!response || !response.data) {
      console.error('Empty AI response');
      throw new Error('AI service returned an empty response');
    }
    
    // Log the raw response to help with debugging
    console.log('🔍 Raw AI Response:', JSON.stringify(response.data, null, 2));
    
    // Extract data from the response, handling different response formats
    // The response might be nested under data or directly in the response
    const responseData = response.data.data || response.data;
    
    // Log the extracted data for debugging
    console.log('🔍 Extracted responseData:', JSON.stringify(responseData, null, 2));
    
    // Extract actions from the appropriate location in the response
    let actions = [];
    
    // Try different possible locations for actions in the response
    if (responseData.actions && Array.isArray(responseData.actions)) {
      actions = responseData.actions;
      console.log('✅ Found actions in responseData.actions:', actions.length);
    } else if (responseData.results && Array.isArray(responseData.results)) {
      actions = responseData.results;
      console.log('✅ Found actions in responseData.results:', actions.length);
    } else if (Array.isArray(responseData)) {
      actions = responseData;
      console.log('✅ Found actions in responseData array:', actions.length);
    } else {
      console.warn('⚠️ No actions found in response, using empty array');
    }
    
    // Extract other data
    const messages = responseData.messages || [];
    const tokensUsed = responseData.tokensUsed || 0;
    const creditsUsed = responseData.creditsUsed || 0;
    const newConversationId = responseData.conversationId;
    
    console.log('🔍 Extracted data:', { 
      actionsCount: actions?.length || 0, 
      messagesCount: messages?.length || 0,
      tokensUsed,
      conversationId: newConversationId
    });
    
    // Format response to match the original API
    // Look for any 'create' actions that we can use
    const createActions = actions?.filter((a: ActionResult) => a.action === 'create') || [];
    
    if (createActions.length > 0) {
      // Process all create actions into results
      const results = createActions.map((action: ActionResult) => ({
        content: action.data.content,
        category: action.data.category,
        isTask: action.data.isTask,
        priority: action.data.priority || 'medium',
        suggestedDueDate: action.data.dueDate,
        enhancedContent: action.data.content,
        completed: action.data.completed || false,
        completedAt: action.data.completedAt,
        labels: action.data.labels || [],
        startTime: action.data.startTime || null,
        endTime: action.data.endTime || null,
        color: action.data.color || null
      }));
       
      console.log('✅ Note categorized successfully with', results.length, 'items');
      
      // If notesContext is provided, create the notes directly
      if (notesContext && results.length > 0) {
        console.log('📝 Creating notes directly using NotesContext');
        for (const result of results) {
          try {
            console.log('📝 Creating note with data:', JSON.stringify(result, null, 2));
            const newNote = await notesContext.createNote({
              content: result.content,
              category: result.category,
              timestamp: Date.now(),
              isTask: result.isTask,
              priority: result.priority,
              dueDate: result.suggestedDueDate,
              startTime: result.startTime,
              endTime: result.endTime,
              completed: result.completed || false,
              completedAt: result.completedAt,
              labels: result.labels || [],
              color: result.color
            } as any);
            console.log('✅ Note created successfully:', newNote.id);
          } catch (error) {
            console.error('❌ Error creating note:', error);
          }
        }
      }
      
      return {
        actions: createActions,
        results,
        messages: messages || [],
        tokensUsed: tokensUsed || 0,
        creditsUsed: creditsUsed || (tokensUsed || 0) / 10,
        conversationId: newConversationId
      };
    }
    
    // Process other action types like update and delete if notesContext is provided
    if (notesContext && actions && actions.length > 0) {
      console.log("📝 Processing other actions with notesContext:", actions.length, "actions");
      for (const action of actions) {
        try {
          if (action.action === 'update' && action.data.id) {
            const { id, ...updates } = action.data;
            await notesContext.updateNote(id, updates);
            console.log(`✅ Note ${id} updated successfully`);
          } else if (action.action === 'delete' && action.data.id) {
            await notesContext.deleteNote(action.data.id);
            console.log(`✅ Note ${action.data.id} deleted successfully`);
          } else {
            console.log(`ℹ️ Skipping action of type ${action.action}`);
          }
        } catch (actionError) {
          console.error(`❌ Error processing ${action.action} action:`, actionError);
        }
      }
    } else if (!actions || actions.length === 0) {
      console.log('⚠️ No actions found in the response');
    }
    
    console.log('⚠️ Note categorization did not result in task creation, but other actions may have happened');
    return {
      actions: actions || [],
      results: [],
      messages: messages || [],
      tokensUsed: tokensUsed || 0,
      creditsUsed: creditsUsed || (tokensUsed || 0) / 10,
      conversationId: newConversationId
    };
  } catch (error) {
    console.error('Error categorizing note:', error);
    throw error;
  }
}

export async function crumbleTask(content: string, context?: CrumbleContext, options: CategorizeOptions = {}): Promise<CrumbleResponse> {
  try {
    console.log('🔨 Crumbling task:', content.substring(0, 50) + (content.length > 50 ? '...' : ''));
    
    // Use the agent to generate subtasks
    const response = await processWithAgent(
      `Break down this task into smaller subtasks: ${content}`, 
      []
    );
    
    console.log('🔍 Raw crumble response:', JSON.stringify(response, null, 2));
    
    // Extract data from the response, handling different response formats
    let subtasks: SubTask[] = [];
    let tokensUsed = 0;
    let creditsUsed = 0;
    
    // Try to extract data from different possible locations
    if (response) {
      // Extract tokens and credits
      tokensUsed = response.tokensUsed || 0;
      creditsUsed = response.creditsUsed || (tokensUsed / 10);
      
      // Try to find subtasks in different locations
      if (response.subtasks && Array.isArray(response.subtasks)) {
        subtasks = response.subtasks;
      } else if (response.data && response.data.subtasks && Array.isArray(response.data.subtasks)) {
        subtasks = response.data.subtasks;
      } else if (response.actions && Array.isArray(response.actions)) {
        // Try to extract subtasks from actions
        const createActions = response.actions.filter((a: ActionResult) => a.action === 'create');
        if (createActions.length > 0) {
          subtasks = createActions.map((action: ActionResult) => ({
            content: action.data.content,
            estimatedTime: action.data.estimatedTime || null,
            priority: action.data.priority || 'medium',
            completed: false
          }));
        }
      }
    }
    
    console.log(`✅ Extracted ${subtasks.length} subtasks from crumble response`);
    
    // Return a compatible format
    return {
      subtasks: subtasks || [],
      tokensUsed: tokensUsed || 0,
      creditsUsed: creditsUsed || 0
    };
  } catch (error) {
    console.error('Error crumbling task:', error);
    // Return empty results on error
    return {
      subtasks: [],
      tokensUsed: 0,
      creditsUsed: 0
    };
  }
}

interface CrumbleContext {
  parentTask: string;
  siblingTasks?: string[];
  subtaskContent: string;
}

export async function checkIfTask(content: string): Promise<TaskCheckResponse> {
  try {
    const response = await apiClient.post('/ai', {
      action: 'checkIfTask',
      content
    });
    return response.data;
  } catch (error) {
    console.error('Error checking if content is a task:', error);
    return { isTask: false, tokensUsed: 0, creditsUsed: 0 };
  }
}

export async function checkClarification(content: string): Promise<ClarificationResponse & { tokensUsed: number; creditsUsed: number }> {
  try {
    const response = await apiClient.post('/ai', {
      action: 'checkClarification',
      content
    });
    return response.data;
  } catch (error) {
    console.error('Error checking for clarification:', error);
    return { needsClarification: false, clarificationQuestion: null, tokensUsed: 0, creditsUsed: 0 };
  }
}

export async function categorizeInput(
  content: string, 
  existingCategories: string[] = [], 
  options: CategorizeOptions = {}
): Promise<CategoryResponse & { tokensUsed: number; creditsUsed: number; enhancedContent: string }> {
  try {
    const currentDateTime = options.clientDateTime || new Date().toISOString();
    const response = await apiClient.post('/ai', {
      action: 'categorizeInput',
      content,
      existingCategories,
      options
    });
    
    if (!response || !response.data) {
      throw new Error('Invalid response from AI service');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error categorizing input:', error);
    return {
      category: 'Uncategorized',
      isTask: false,
      priority: null,
      suggestedDueDate: null,
      enhancedContent: content,
      tokensUsed: 0,
      creditsUsed: 0
    };
  }
}

export async function breakdownContent(content: string, existingCategories: string[] = []): Promise<BreakdownResponse> {
  try {
    const currentDateTime = new Date().toISOString();
    const response = await apiClient.post('/ai', {
      action: 'breakdownContent',
      content,
      existingCategories
    });
    
    if (!response || !response.data) {
      throw new Error('Invalid response from AI service');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error breaking down content:', error);
    return { 
      items: [{ 
        content, 
        type: 'note', 
        category: 'Uncategorized',
        priority: 'optional',
        suggestedDueDate: null,
        completed: false,
        completedAt: null
      }],
      tokensUsed: 0,
      creditsUsed: 0
    };
  }
}

// Helper function to process a single item
export async function processSingleItem(
  content: string,
  existingCategories: string[] = [],
  options: CategorizeOptions = {}
): Promise<ExtendedCategoryResponse> {
  if (options.skipClarityCheck) {
    const categorization = await categorizeInput(content, existingCategories, options);
    return {
      ...categorization,
      content,
      clarificationNeeded: false,
      clarificationQuestion: null,
      tokensUsed: categorization.tokensUsed
    };
  }

  const taskCheck = await checkIfTask(content);
  
  if (!taskCheck.isTask) {
    const categorization = await categorizeInput(content, existingCategories, options);
    return {
      ...categorization,
      content,
      isTask: false,
      clarificationNeeded: false,
      clarificationQuestion: null,
      tokensUsed: categorization.tokensUsed
    };
  }

  const clarification = await checkClarification(content);
  
  if (clarification.needsClarification) {
    return {
      category: 'Drafts',
      isTask: true,
      priority: null,
      suggestedDueDate: null,
      clarificationNeeded: true,
      clarificationQuestion: clarification.clarificationQuestion,
      tokensUsed: clarification.tokensUsed
    };
  }

  const categorization = await categorizeInput(content, existingCategories, options);
  return {
    ...categorization,
    clarificationNeeded: false,
    clarificationQuestion: null,
    tokensUsed: categorization.tokensUsed
  };
}

