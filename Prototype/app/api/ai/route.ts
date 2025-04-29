import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getFirestore } from "firebase-admin/firestore";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { authMiddleware } from '@/libs/middleware';
import { ChatCompletionMessageParam } from 'openai/resources';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
      clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.AUTH_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// Define tool schema
const agentTools = [
  {
    type: "function" as const,
    function: {
      name: "createTask",
      description: "Create a new task with specified attributes",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content/description of the task"
          },
          category: {
            type: "string",
            description: "Category for the task (use existing if mentioned or create appropriate new one)"
          },
          priority: {
            type: "string",
            enum: ["optional", "low", "medium", "high", "critical"],
            description: "Priority level of the task"
          },
          dueDate: {
            type: "string",
            description: "ISO date string for when the task is due (YYYY-MM-DD format)"
          },
          startTime: {
            type: "string",
            description: "ISO datetime string for when the task starts (YYYY-MM-DDThh:mm:ss format)"
          },
          endTime: {
            type: "string",
            description: "ISO datetime string for when the task ends (YYYY-MM-DDThh:mm:ss format)"
          },
          isTask: {
            type: "boolean",
            description: "Whether this is a task (true) or a note (false)"
          },
          completed: {
            type: "boolean",
            description: "Whether the task is completed"
          },
          labels: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Tags or labels associated with this task"
          },
          color: {
            type: "string",
            description: "Color for calendar events. Options: blue, green, purple, pink, orange, yellow, red, indigo, teal, gray"
          }
        },
        required: ["content", "category", "isTask"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "updateTask",
      description: "Update an existing task with new attributes. Use search task first.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the task to update"
          },
          content: {
            type: "string",
            description: "The content/description of the task"
          },
          category: {
            type: "string",
            description: "Category for the task"
          },
          priority: {
            type: "string",
            enum: ["optional", "low", "medium", "high", "critical"],
            description: "Priority level of the task"
          },
          dueDate: {
            type: "string",
            description: "ISO date string for when the task is due (YYYY-MM-DD format)"
          },
          startTime: {
            type: "string",
            description: "ISO datetime string for when the task starts (YYYY-MM-DDThh:mm:ss format)"
          },
          endTime: {
            type: "string",
            description: "ISO datetime string for when the task ends (YYYY-MM-DDThh:mm:ss format)"
          },
          completed: {
            type: "boolean",
            description: "Whether the task is completed"
          },
          labels: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Tags or labels associated with this task"
          },
          color: {
            type: "string",
            description: "Color for calendar events. Options: blue, green, purple, pink, orange, yellow, red, indigo, teal, gray"
          }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "deleteTask",
      description: "Delete a task by ID. Use searchTask first",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the task to delete"
          }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "searchTasks",
      description: "Search for tasks matching a query string in the cached task list",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Text to search for within task content, category, or labels. A single word is the best"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default 5)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "getRecentTasks",
      description: "Get the most recent tasks(to provide context to the user)",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of recent tasks to retrieve (default 20)"
          }
        }
      }
    }
  }
];

// Type definitions for the conversation
type Message = {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
  tool_calls?: any[];
  timestamp?: number;
  _processed?: boolean;
};

type Conversation = {
  id: string;
  userId: string;
  messages: Message[];
  lastUpdated: number;
};

type FunctionResult = {
  name: string;
  result: any;
};

type ActionResult = {
  action: string;
  data: any;
  message?: string;
};

type AgentResponse = {
  actions: ActionResult[];
  messages: string[];
  tokensUsed: number;
  conversationId: string;
};

// Convert our internal message type to OpenAI's expected format
function convertToOpenAIMessages(messages: Message[]): ChatCompletionMessageParam[] {
  console.log('🔄 Converting messages to OpenAI format:', 
    JSON.stringify(messages.map(m => ({
      role: m.role,
      content: m.content?.substring(0, 30) + (m.content?.length > 30 ? '...' : ''),
      name: m.name,
      tool_calls: m.tool_calls ? m.tool_calls.map(t => t.id) : null
    })), null, 2));
  
  // First, organize messages to ensure tool responses follow their tool calls
  const organizedMessages: Message[] = [];
  const toolResponseMap = new Map<string, Message[]>();
  
  // First pass: collect all function responses by their tool_call_id
  messages.forEach(msg => {
    if (msg.role === 'function' && msg.name) {
      if (!toolResponseMap.has(msg.name)) {
        toolResponseMap.set(msg.name, []);
      }
      toolResponseMap.get(msg.name).push(msg);
    }
  });
  
  // Second pass: build the organized message list
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    // Skip function messages as we'll add them after their corresponding tool calls
    if (msg.role === 'function') continue;
    
    // Add the current message
    organizedMessages.push(msg);
    
    // If this is an assistant message with tool calls, add all corresponding function responses
    if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      for (const tool of msg.tool_calls) {
        const toolId = tool.id;
        const responses = toolResponseMap.get(toolId) || [];
        
        if (responses.length > 0) {
          // Add all responses for this tool call
          organizedMessages.push(...responses);
          // Remove these responses from the map to avoid duplicates
          toolResponseMap.delete(toolId);
        } else {
          console.warn(`⚠️ No function response found for tool call ${toolId}`);
          // Create a default response
          organizedMessages.push({
            role: 'function',
            name: toolId,
            content: JSON.stringify({ 
              success: false, 
              error: "No response was provided for this tool call"
            }),
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  // Now convert the organized messages to OpenAI format
  const convertedMessages = organizedMessages.map(msg => {
    if (msg.role === 'system') {
      return { 
        role: 'system' as const, 
        content: msg.content 
      };
    } else if (msg.role === 'user') {
      return { 
        role: 'user' as const, 
        content: msg.content 
      };
    } else if (msg.role === 'assistant') {
      // For assistant messages with tool calls
      return { 
        role: 'assistant' as const, 
        content: msg.content || '',
        tool_calls: msg.tool_calls 
      };
    } else if (msg.role === 'function') {
      // For function response messages, convert to tool response format
      if (!msg.name) {
        console.warn('⚠️ Function message missing name (tool_call_id):', 
          JSON.stringify(msg, null, 2));
        // Skip this message as it's invalid
        return null;
      }
      
      return {
        role: 'tool' as const,
        tool_call_id: msg.name, // This must match the tool_call.id from the assistant message
        content: msg.content,
      };
    }
    // Default fallback
    return { 
      role: 'user' as const, 
      content: msg.content 
    };
  }).filter(Boolean); // Remove any null entries
  
  // Log the converted messages
  console.log('🔄 Converted to OpenAI format:', 
    JSON.stringify(convertedMessages.map(m => ({
      role: m.role,
      content: m.content?.substring(0, 30) + (m.content?.length > 30 ? '...' : ''),
      tool_call_id: 'tool_call_id' in m ? m.tool_call_id : undefined,
      tool_calls: 'tool_calls' in m && m.tool_calls ? 'has tool calls' : null
    })), null, 2));
  
  return convertedMessages;
}

// Get the user's conversation history from Firebase
async function getConversationHistory(userId: string, conversationId?: string): Promise<Conversation> {
  try {
    if (conversationId) {
      // Try to fetch existing conversation
      const conversationDoc = await db.collection('users')
        .doc(userId)
        .collection('conversations')
        .doc(conversationId)
        .get();
      
      if (conversationDoc.exists) {
        return {
          id: conversationId,
          userId,
          ...conversationDoc.data()
        } as Conversation;
      }
    }
    
    // Create a new conversation
    const newConversationRef = await db.collection('users')
      .doc(userId)
      .collection('conversations')
      .add({
        userId,
        messages: [],
        lastUpdated: Date.now()
      });
    
    return {
      id: newConversationRef.id,
      userId,
      messages: [],
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error('❌ Failed to get conversation history:', error);
    // Return a new conversation if we can't get history
    return {
      id: `temp-${Date.now()}`,
      userId,
      messages: [],
      lastUpdated: Date.now()
    };
  }
}

// Save conversation history to Firebase with message trimming
async function saveConversationHistory(conversation: Conversation): Promise<void> {
  try {
    // Helper function to sanitize a message object by removing undefined values
    const sanitizeMessage = (message: any): any => {
      if (!message) return null;
      
      // Deep copy the message to avoid modifying the original
      const sanitized = JSON.parse(JSON.stringify(message));
      
      // Handle tool_calls specifically - ensure it's either a valid array or null
      if (sanitized.tool_calls === undefined) {
        sanitized.tool_calls = null;
      } else if (Array.isArray(sanitized.tool_calls)) {
        // Sanitize each tool call
        sanitized.tool_calls = sanitized.tool_calls.map((tool: any) => {
          const cleanTool: any = {};
          // Only keep defined properties
          Object.entries(tool).forEach(([key, value]) => {
            if (value !== undefined) cleanTool[key] = value;
          });
          return cleanTool;
        });
      }
      
      // Handle function_call
      if (sanitized.function_call === undefined) {
        sanitized.function_call = null;
      }
      
      // Handle name
      if (sanitized.name === undefined) {
        sanitized.name = null;
      }
      
      return sanitized;
    };
    
    // Trim messages to keep only the most recent ones
    // Keep system prompt + last 20 messages for context
    const MAX_MESSAGES = 20;
    let messagesToSave = [...conversation.messages];
    
    // If we have more messages than the limit
    if (messagesToSave.length > MAX_MESSAGES + 1) {
      // First, find the system message (if any)
      const systemMessageIndex = messagesToSave.findIndex(msg => msg.role === 'system');
      
      if (systemMessageIndex !== -1) {
        // Preserve the system message
        const systemMessage = messagesToSave[systemMessageIndex];
        // Keep the latest messages up to MAX_MESSAGES
        messagesToSave = messagesToSave.slice(-MAX_MESSAGES);
        // Add the system message back at the beginning if it wasn't part of the latest messages
        if (!messagesToSave.some(msg => msg.role === 'system')) {
          messagesToSave = [systemMessage, ...messagesToSave];
        }
      } else {
        // No system message, just take the latest MAX_MESSAGES
        messagesToSave = messagesToSave.slice(-MAX_MESSAGES);
      }
      
      console.log(`📝 AI Route - Trimmed conversation history from ${conversation.messages.length} to ${messagesToSave.length} messages`);
    }
    
    // Log the messages before reorganization
    console.log('📝 AI Route - Messages before reorganization:', 
      JSON.stringify(messagesToSave.map((m, i) => ({
        index: i,
        role: m.role,
        content: m.content?.substring(0, 30) + (m.content?.length > 30 ? '...' : ''),
        name: m.name,
        tool_calls: m.tool_calls ? m.tool_calls.map(t => t.id) : null
      })), null, 2));
    
    // Create a map of tool calls and their responses for validation
    const toolCallMap = new Map<string, { 
      toolCallMessage: Message, 
      toolCallIndex: number,
      responseMessage?: Message,
      responseIndex?: number
    }>();
    
    // First pass: identify all tool calls and their responses
    messagesToSave.forEach((message, index) => {
      // Track assistant messages with tool calls
      if (message.role === 'assistant' && message.tool_calls && Array.isArray(message.tool_calls)) {
        message.tool_calls.forEach(tool => {
          if (tool && tool.id) {
            toolCallMap.set(tool.id, { 
              toolCallMessage: message, 
              toolCallIndex: index 
            });
            console.log(`🔍 Found tool call ID: ${tool.id} at index ${index}`);
          }
        });
      }
      
      // Track function responses
      if (message.role === 'function' && message.name) {
        const toolCallEntry = toolCallMap.get(message.name);
        if (toolCallEntry) {
          toolCallMap.set(message.name, {
            ...toolCallEntry,
            responseMessage: message,
            responseIndex: index
          });
          console.log(`🔍 Found matching function response for tool call ID: ${message.name} at index ${index}`);
        } else {
          console.log(`⚠️ Found function response with ID ${message.name} but no matching tool call`);
        }
      }
    });
    
    // Log the tool call map for debugging
    console.log(`🔍 Tool call map has ${toolCallMap.size} entries:`, 
      JSON.stringify(Array.from(toolCallMap.entries()).map(([id, entry]) => ({
        id,
        toolCallIndex: entry.toolCallIndex,
        responseIndex: entry.responseIndex
      })), null, 2));
    
    // Check for missing responses
    const missingResponses = Array.from(toolCallMap.entries())
      .filter(([_, entry]) => !entry.responseMessage)
      .map(([id, _]) => id);
    
    if (missingResponses.length > 0) {
      console.log(`⚠️ Missing function responses for tool calls: ${missingResponses.join(', ')}`);
    }
    
    // Second pass: reorganize messages to ensure tool calls are followed by their responses
    const reorganizedMessages: Message[] = [];
    const processedIndices = new Set<number>();
    
    // Process messages in order
    for (let i = 0; i < messagesToSave.length; i++) {
      // Skip if already processed
      if (processedIndices.has(i)) continue;
      
      const message = messagesToSave[i];
      
      // For assistant messages with tool calls
      if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
        // Add the assistant message
        reorganizedMessages.push(message);
        processedIndices.add(i);
        
        // Check if all tool calls have responses
        const allToolCallsHaveResponses = message.tool_calls.every(
          tool => tool.id && toolCallMap.get(tool.id)?.responseMessage
        );
        
        if (allToolCallsHaveResponses) {
          // Add all function responses immediately after the assistant message
          for (const tool of message.tool_calls) {
            const toolCallEntry = toolCallMap.get(tool.id);
            if (toolCallEntry?.responseMessage) {
              reorganizedMessages.push(toolCallEntry.responseMessage);
              processedIndices.add(toolCallEntry.responseIndex);
              console.log(`✅ Added function response for tool call ${tool.id} immediately after assistant message`);
            }
          }
        } else {
          // If any tool call is missing a response, convert to a regular message
          console.log(`⚠️ Assistant message at index ${i} has tool calls without responses, converting to regular message`);
          
          // Find which tool calls are missing responses
          const missingToolCalls = message.tool_calls
            .filter(tool => !toolCallMap.get(tool.id)?.responseMessage)
            .map(tool => tool.id);
          
          console.log(`⚠️ Missing responses for tool calls: ${missingToolCalls.join(', ')}`);
          
          // We've already added the message, but we need to remove tool_calls
          reorganizedMessages[reorganizedMessages.length - 1] = {
            ...message,
            content: message.content || "I need to perform some actions for you.",
            tool_calls: null
          };
        }
      } 
      // For function messages that haven't been processed yet
      else if (message.role === 'function' && !processedIndices.has(i)) {
        // Only include if it responds to a valid tool call
        if (message.name && toolCallMap.has(message.name)) {
          const toolCallEntry = toolCallMap.get(message.name);
          
          // If the tool call message has already been added, add this response
          if (processedIndices.has(toolCallEntry.toolCallIndex)) {
            reorganizedMessages.push(message);
            processedIndices.add(i);
            console.log(`✅ Added function response for tool call ${message.name} after its tool call message`);
          } else {
            // Otherwise, we'll add it when we process the tool call message
            console.log(`ℹ️ Skipping function message at index ${i} until we process its tool call`);
          }
        } else {
          console.log(`⚠️ Skipping function message at index ${i} with invalid tool_call_id: ${message.name}`);
        }
      }
      // Include all other message types
      else {
        reorganizedMessages.push(message);
        processedIndices.add(i);
      }
    }
    
    console.log(`📝 Reorganized ${messagesToSave.length} messages into ${reorganizedMessages.length} messages`);
    
    // Log the reorganized messages for debugging
    console.log('📝 AI Route - Reorganized messages:', 
      JSON.stringify(reorganizedMessages.map((m, i) => ({
        index: i,
        role: m.role,
        content: m.content?.substring(0, 30) + (m.content?.length > 30 ? '...' : ''),
        name: m.name,
        tool_calls: m.tool_calls ? m.tool_calls.map(t => t.id) : null
      })), null, 2));
    
    // Sanitize all messages in the conversation
    const sanitizedMessages = reorganizedMessages.map(sanitizeMessage).filter(Boolean);
    
    await db.collection('users')
      .doc(conversation.userId)
      .collection('conversations')
      .doc(conversation.id)
      .set({
        messages: sanitizedMessages,
        lastUpdated: Date.now()
      }, { merge: true });
    
    console.log(`💾 Saved conversation ${conversation.id} with ${sanitizedMessages.length} messages`);
  } catch (error) {
    console.error('❌ Failed to save conversation history:', error);
  }
}

// Function to create a default function response for a tool call
function createDefaultFunctionResponse(toolCallId: string): Message {
  console.log(`🔧 Creating default function response for tool call ${toolCallId}`);
  
  return {
    role: 'function',
    name: toolCallId,
    content: JSON.stringify({ 
      success: false, 
      error: "No response was provided for this tool call"
    }),
    timestamp: Date.now()
  };
}

// Function to repair conversation history before sending to OpenAI
// This ensures that every assistant message with tool calls has corresponding tool responses
function repairConversationHistory(messages: Message[]): Message[] {
  console.log('🔧 Repairing conversation history...');
  
  // Create a map to track tool calls and their responses
  const toolCallMap = new Map<string, { 
    hasResponse: boolean,
    toolCallIndex: number,
    responseIndex?: number
  }>();
  
  // First pass: identify all tool calls and their responses
  messages.forEach((message, index) => {
    // Track assistant messages with tool calls
    if (message.role === 'assistant' && message.tool_calls && Array.isArray(message.tool_calls)) {
      message.tool_calls.forEach(tool => {
        if (tool && tool.id) {
          toolCallMap.set(tool.id, { 
            hasResponse: false, 
            toolCallIndex: index 
          });
          console.log(`🔍 Found tool call ID: ${tool.id} at index ${index}`);
        }
      });
    }
    
    // Track function responses
    if (message.role === 'function' && message.name) {
      const toolCallEntry = toolCallMap.get(message.name);
      if (toolCallEntry) {
        toolCallMap.set(message.name, {
          ...toolCallEntry,
          hasResponse: true,
          responseIndex: index
        });
        console.log(`🔍 Found matching function response for tool call ID: ${message.name} at index ${index}`);
      }
    }
  });
  
  // Check for missing responses
  const missingResponses = Array.from(toolCallMap.entries())
    .filter(([_, entry]) => !entry.hasResponse)
    .map(([id, entry]) => ({ id, index: entry.toolCallIndex }));
  
  if (missingResponses.length > 0) {
    console.log(`⚠️ Found ${missingResponses.length} tool calls without responses`);
    
    // Create a new array of messages with problematic tool calls fixed
    const repairedMessages: Message[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      // For assistant messages with tool calls
      if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
        // Check if all tool calls have responses
        const allToolCallsHaveResponses = message.tool_calls.every(
          tool => tool.id && toolCallMap.get(tool.id)?.hasResponse
        );
        
        if (allToolCallsHaveResponses) {
          // Add the message as is
          repairedMessages.push(message);
          
          // Make sure to add all function responses immediately after
          const toolCallIds = message.tool_calls.map(tool => tool.id);
          const responseMessages = messages
            .filter(msg => msg.role === 'function' && msg.name && toolCallIds.includes(msg.name));
          
          repairedMessages.push(...responseMessages);
        } else {
          // Option 1: Convert to a regular message without tool_calls
          // console.log(`⚠️ Converting assistant message at index ${i} to regular message (removing tool_calls)`);
          // repairedMessages.push({
          //   ...message,
          //   content: message.content || "I need to perform some actions for you.",
          //   tool_calls: null
          // });
          
          // Option 2: Keep the tool calls but add default responses
          console.log(`⚠️ Adding default responses for missing tool calls in message at index ${i}`);
          repairedMessages.push(message);
          
          // Add responses for each tool call
          for (const tool of message.tool_calls) {
            const toolCallId = tool.id;
            const hasResponse = toolCallMap.get(toolCallId)?.hasResponse;
            
            if (hasResponse) {
              // Find the existing response
              const responseMessage = messages.find(
                msg => msg.role === 'function' && msg.name === toolCallId
              );
              
              if (responseMessage) {
                repairedMessages.push(responseMessage);
              }
            } else {
              // Create a default response
              repairedMessages.push(createDefaultFunctionResponse(toolCallId));
            }
          }
        }
      } 
      // For function messages, only include if they haven't been added already
      else if (message.role === 'function') {
        // Check if this function message has already been added
        const alreadyAdded = repairedMessages.some(
          m => m.role === 'function' && m.name === message.name
        );
        
        if (!alreadyAdded) {
          // Check if the corresponding tool call exists and has been added
          const toolCallId = message.name;
          const toolCallEntry = toolCallMap.get(toolCallId);
          
          if (toolCallEntry && toolCallEntry.hasResponse) {
            // Find the assistant message with this tool call
            const assistantMessage = messages[toolCallEntry.toolCallIndex];
            
            // Check if the assistant message has been added
            const assistantAdded = repairedMessages.some(
              (m) => m.role === 'assistant' && 
                m.tool_calls && 
                m.tool_calls.some(tool => tool.id === toolCallId)
            );
            
            if (assistantAdded) {
              repairedMessages.push(message);
            }
          }
        }
      }
      // Include all other message types (system, user, assistant without tool calls)
      else {
        repairedMessages.push(message);
      }
    }
    
    console.log(`🔧 Repaired conversation history: ${messages.length} messages -> ${repairedMessages.length} messages`);
    return repairedMessages;
  }
  
  // If no issues found, return the original messages
  return messages;
}

async function runAgentConversation(
  userInput: string, 
  existingCategories: string[], 
  cachedTasks: any[], 
  userId: string,
  conversationId?: string
): Promise<AgentResponse> {
  try {
    const currentDateTime = new Date().toISOString();
    
    // Get conversation history
    const conversation = await getConversationHistory(userId, conversationId);
    
    // Initialize conversation history and response data
    let conversationMessages: Message[] = [];
    const actionResults: ActionResult[] = [];
    const textMessages: string[] = [];
    let totalTokensUsed = 0;
    
    // Initial system prompt for the agent
    const systemPrompt = `You are a highly efficient task management assistant. Your role is to help the user organize tasks and notes.

Current date and time: ${currentDateTime}

User request: "${userInput}"

You have access to the following tools. Analyze user input to determine the best actions. Only reply after you've executed ALL actions:

- Assign a category from existing ones: ${existingCategories.join(", ")}
- Determine priority based on context
- Extract time/date information for calendar placement
- Set start and end times for calendar display
- Identify if it's a task (actionable) or note (informational)
- Suggest appropriate labels/tags (e.g., work, personal, urgent)
- Assign a color to calendar events (options: blue, green, purple, pink, orange, yellow, red, indigo, teal, gray)

IMPORTANT:
- Use the current date for times without dates (e.g., "meeting at 3pm") unless context suggests otherwise.
- For calendar tasks, always set both startTime and endTime, and set dueDate to match endTime.
- Assign a unique color to calendar events.
- Use createTask for any input resembling a task or memory request. Default to creating tasks.
- Inputs starting with "create", "add", "make", "schedule", or "remind" must be treated as task creation requests.
- If a task ID isn't provided, use searchTasks to find relevant tasks first.
- Task IDs do not start with "temp-"; use searchTasks if you don't have the ID.
- Respond conversationally, explaining your actions.
- When replacing a note/task, create a new one and delete the old.
- When searching for tasks, you can use day names like "Monday" or "Friday" (e.g., "monday workout" or just "friday").
- Always keep the original user request: "${userInput}"`;

    // Add system message
    conversationMessages.push({ 
      role: 'system', 
      content: systemPrompt,
      timestamp: Date.now()
    });
    
    // Add conversation history (last 5 messages)
    if (conversation.messages.length > 0) {
      const historyMessages = conversation.messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'function')
        .slice(-10); // Get last 10 messages (5 turns)
      
      conversationMessages = [...conversationMessages, ...historyMessages];
      
      console.log(`📜 Added ${historyMessages.length} history messages to conversation`);
    }
    
    // Add current user message
    const userMessage: Message = { 
      role: 'user', 
      content: userInput,
      timestamp: Date.now()
    };
    conversationMessages.push(userMessage);
    
    // Add this user message to the history
    conversation.messages.push(userMessage);
    
    console.log('🔍 AI Route - Processing input:', userInput);
    console.log('📊 AI Route - Existing categories:', existingCategories);
    
    // Start the conversation loop
    let continueConversation = true;
    
    while (continueConversation) {
      // Repair the conversation history before sending to OpenAI
      const repairedMessages = repairConversationHistory(conversationMessages);
      
      // Log the conversation messages being sent to OpenAI
      const openaiMessages = convertToOpenAIMessages(repairedMessages);
      console.log('🤖 AI Route - Calling OpenAI with conversation history:', JSON.stringify(openaiMessages, null, 2));
      
      // Call OpenAI with the repaired conversation history
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        tools: agentTools,
        temperature: 0.2,
      });
      
      // Track tokens used
      totalTokensUsed += response.usage?.total_tokens || 0;
      
      // Process the response
      const assistantMessage = response.choices[0].message;
      
      // Log the full assistant message for debugging
      console.log('🔍 AI Route - Raw assistant message:', JSON.stringify(assistantMessage, null, 2));
      
      // Add the assistant's message to the conversation history
      const assistantHistoryMessage: Message = {
        role: 'assistant',
        content: assistantMessage.content || '',
        tool_calls: assistantMessage.tool_calls,
        timestamp: Date.now()
      };
      
      conversationMessages.push(assistantHistoryMessage);
      conversation.messages.push(assistantHistoryMessage);
      
      // If there's content (text response), add it to our text messages array
      if (assistantMessage.content) {
        console.log('🔊 AI Route - Assistant text response:', assistantMessage.content);
        textMessages.push(assistantMessage.content);
      }
      
      // If there are tool calls, process them
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(`🔧 AI Route - Processing ${assistantMessage.tool_calls.length} tool calls:`, 
          JSON.stringify(assistantMessage.tool_calls, null, 2));
        
        // Track if we've processed all tool calls successfully
        let allToolCallsProcessed = true;
        
        // Process each tool call and collect responses
        for (const toolCall of assistantMessage.tool_calls) {
          try {
            const functionName = toolCall.function.name;
            let functionArgs;
            
            try {
              functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (parseError) {
              console.error(`❌ AI Route - Error parsing arguments for tool call ${toolCall.id}:`, parseError);
              // Provide a fallback for malformed JSON
              functionArgs = { error: "Failed to parse arguments" };
            }
            
            console.log(`🛠️ AI Route - Tool call detected: ${functionName} with ID ${toolCall.id}`, 
              JSON.stringify(functionArgs, null, 2));
            
            // Process the function call
            let functionResult: any;
            
            switch (functionName) {
              case 'createTask':
                // Format the task for creation
                const newTask = {
                  content: functionArgs.content || userInput,
                  category: functionArgs.category || existingCategories[0] || 'Inbox',
                  timestamp: Date.now(),
                  isTask: functionArgs.isTask !== undefined ? functionArgs.isTask : true,
                  priority: functionArgs.priority || 'medium',
                  dueDate: functionArgs.dueDate || null,
                  startTime: functionArgs.startTime || null,
                  endTime: functionArgs.endTime || null,
                  completed: functionArgs.completed || false,
                  labels: functionArgs.labels || [],
                  color: functionArgs.color || null,
                };
                
                console.log('📝 AI Route - Creating task:', JSON.stringify(newTask, null, 2));
                
                // Add to our action results
                actionResults.push({ action: 'create', data: newTask });
                
                // Return the task creation result to the model
                functionResult = { success: true, taskId: `temp-${Date.now()}`, task: newTask };
                break;
                
              case 'updateTask':
                const taskId = functionArgs.id;
                delete functionArgs.id; // Remove ID from the updates object
                
                console.log(`🔄 AI Route - Updating task ${taskId}:`, JSON.stringify(functionArgs, null, 2));
                
                // Add to our action results
                actionResults.push({ action: 'update', data: { id: taskId, ...functionArgs } });
                
                // Return the update result to the model
                functionResult = { success: true, taskId: taskId, updates: functionArgs };
                break;
                
              case 'deleteTask':
                console.log(`🗑️ AI Route - Deleting task ${functionArgs.id}`);
                
                // Add to our action results
                actionResults.push({ action: 'delete', data: { id: functionArgs.id } });
                
                // Return the delete result to the model
                functionResult = { success: true, taskId: functionArgs.id, message: 'Task deleted successfully' };
                break;
                
              case 'searchTasks':
                console.log(`🔍 AI Route - Searching tasks for "${functionArgs.query}"`);
                
                // Check if the query contains a day of the week
                const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                const queryLower = functionArgs.query.toLowerCase();
                
                // Extract day name from query if present
                let dayFilter = null;
                let restOfQuery = queryLower;
                
                for (const day of dayNames) {
                  if (queryLower.includes(day)) {
                    dayFilter = day;
                    // Remove the day name from the query for other filtering
                    restOfQuery = queryLower.replace(day, '').trim();
                    break;
                  }
                }
                
                const limit = functionArgs.limit || 5;
                
                // Filter tasks by day if a day name was found
                let filteredByDay = cachedTasks;
                if (dayFilter) {
                  console.log(`🔍 AI Route - Filtering by day: ${dayFilter}`);
                  
                  filteredByDay = cachedTasks.filter(task => {
                    if (task.startTime) {
                      const taskDate = new Date(task.startTime);
                      const taskDay = taskDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                      return taskDay === dayFilter;
                    }
                    return false;
                  });
                  
                  // If we only searched for a day with no other query terms, return all tasks for that day
                  if (!restOfQuery) {
                    console.log(`🔍 AI Route - Returning all tasks for ${dayFilter}`);
                    const tasksToReturn = filteredByDay.slice(0, limit);
                    
                    // Add to our action results
                    actionResults.push({ action: 'search', data: tasksToReturn });
                    
                    // Return the search results to the model
                    functionResult = { success: true, tasks: tasksToReturn };
                    break;
                  }
                }
                
                // Break the remaining query into individual words for better search results
                const queryWords = restOfQuery.split(/\s+/).filter((word: string) => word.length > 1);
                
                // If we have no query words after removing the day (or no day was in the query), use the original
                const wordsToSearch = queryWords.length > 0 ? queryWords : functionArgs.query.toLowerCase().split(/\s+/).filter((word: string) => word.length > 1);
                
                // Calculate scores for each task based on word matches
                const scoredTasks = filteredByDay.map(task => {
                  let score = 0;
                  const content = task.content?.toLowerCase() || '';
                  const category = task.category?.toLowerCase() || '';
                  const labels = task.labels || [];
                  
                  // Score each word match
                  for (const word of wordsToSearch) {
                    // Content matches are weighted higher
                    if (content.includes(word)) {
                      score += 10;
                      // Exact matches get extra points
                      if (content === word || content.startsWith(`${word} `) || content.endsWith(` ${word}`)) {
                        score += 5;
                      }
                    }
                    
                    // Category matches
                    if (category.includes(word)) {
                      score += 5;
                    }
                    
                    // Label matches
                    for (const label of labels) {
                      if (label.toLowerCase().includes(word)) {
                        score += 3;
                      }
                    }
                  }
                  
                  return { task, score };
                });
                
                // Filter out tasks with no matches and sort by score
                const matchingTasks = scoredTasks
                  .filter(item => item.score > 0)
                  .sort((a, b) => b.score - a.score)
                  .map(item => item.task)
                  .slice(0, limit);
                
                console.log(`🔍 AI Route - Found ${matchingTasks.length} matching tasks using word-based scoring`);
                
                // Add to our action results
                actionResults.push({ action: 'search', data: matchingTasks });
                
                // Return the search results to the model
                functionResult = { success: true, tasks: matchingTasks };
                break;
                
              case 'getRecentTasks':
                console.log(`🔍 AI Route - Getting recent tasks (${functionArgs.limit || 20})`);
                
                const tasksToReturn = cachedTasks.slice(0, functionArgs.limit || 20);
                
                // Add to our action results
                actionResults.push({ action: 'getRecent', data: tasksToReturn });
                
                // Return the tasks to the model
                functionResult = { success: true, tasks: tasksToReturn };
                break;
                
              default:
                functionResult = { success: false, error: 'Unknown function' };
            }
            
            // Add the function result to conversation history
            const functionResponseMessage: Message = {
              role: 'function',
              name: toolCall.id, // This must match the tool_call.id from the assistant message
              content: JSON.stringify(functionResult),
              timestamp: Date.now()
            };
            
            // Log the function response for debugging
            console.log(`🔧 AI Route - Function response for tool call ${toolCall.id}:`, 
              JSON.stringify(functionResponseMessage, null, 2));
            
            conversationMessages.push(functionResponseMessage);
            conversation.messages.push(functionResponseMessage);
          } catch (toolError) {
            console.error(`❌ AI Route - Error processing tool call ${toolCall.id}:`, toolError);
            
            // Mark that we had an error with a tool call
            allToolCallsProcessed = false;
            
            // Add an error response for this tool call to avoid OpenAI API errors
            // IMPORTANT: We must still provide a response for each tool call
            const errorResponseMessage: Message = {
              role: 'function',
              name: toolCall.id, // Must match the tool_call.id
              content: JSON.stringify({ 
                success: false, 
                error: toolError instanceof Error ? toolError.message : 'Unknown error'
              }),
              timestamp: Date.now()
            };
            
            console.log(`⚠️ AI Route - Added error response for tool call ${toolCall.id}`);
            
            conversationMessages.push(errorResponseMessage);
            conversation.messages.push(errorResponseMessage);
          }
        }
        
        // If we had any errors processing tool calls, we might want to end the conversation
        if (!allToolCallsProcessed) {
          console.log('⚠️ AI Route - Some tool calls had errors, may end conversation early');
        }
        
        // Check if we need another round of conversation
        // If the assistant's message had only tool calls and no content, we need to continue
        // to get the assistant's final response after processing the tool calls
        if (!assistantMessage.content || assistantMessage.content.trim() === '') {
          console.log('🔄 AI Route - Continuing conversation to get assistant response after tool calls');
          continueConversation = true;
        } else {
          // If the assistant already provided content along with tool calls, we can end
          console.log('✅ AI Route - Assistant provided content with tool calls, ending conversation');
          continueConversation = false;
        }
      } else {
        // If there are no tool calls, we can end the conversation
        console.log('✅ AI Route - No tool calls, ending conversation');
        continueConversation = false;
      }
    }
    
    // Save the updated conversation history
    await saveConversationHistory(conversation);
    
    // Log the final conversation history for debugging
    console.log('📝 AI Route - Final conversation history:', 
      JSON.stringify(conversation.messages.map(m => ({
        role: m.role,
        content: m.content?.substring(0, 50) + (m.content?.length > 50 ? '...' : ''),
        name: m.name,
        tool_calls: m.tool_calls ? `${m.tool_calls.length} tool calls` : null
      })), null, 2));

    console.log('✅ AI Route - Conversation complete with:', actionResults.length, 'actions and', textMessages.length, 'messages');

    // Log the final actions for debugging
    console.log('📊 AI Route - Final actions:', JSON.stringify(actionResults, null, 2));
    
    return {
      actions: actionResults,
      messages: textMessages,
      tokensUsed: totalTokensUsed,
      conversationId: conversation.id
    };
  } catch (error) {
    console.error('❌ AI Route - Error in runAgentConversation:', error);
    throw error;
  }
}

async function deductCredits(userId: string, tokensUsed: number) {
  const creditsToDeduct = Math.max(1, Math.ceil(tokensUsed / 10));
  
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  if (!userData?.credits) {
    throw new Error('No credits found for user');
  }

  await db.collection('users').doc(userId).update({
    credits: userData.credits - creditsToDeduct
  });

  const date = new Date().toISOString().split('T')[0];
  const usageDocRef = db.collection('users').doc(userId).collection('usage').doc(date);

  const usageDoc = await usageDocRef.get();
  if (usageDoc.exists) {
    const currentData = usageDoc.data();
    await usageDocRef.update({ 
      tokens: (currentData?.tokens || 0) + tokensUsed,
      credits: (currentData?.credits || 0) + creditsToDeduct
    });
  } else {
    await usageDocRef.set({ 
      tokens: tokensUsed,
      credits: creditsToDeduct
    });
  }

  return creditsToDeduct;
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const userId = authResult.user_id;
  
  try {
    const body = await req.json();
    const { 
      input, 
      existingCategories = [],
      cachedTasks = [],
      conversationId = undefined
    } = body;

    // Input validation
    if (!input || typeof input !== 'string') {
      console.error('❌ Invalid input:', input);
      return NextResponse.json(
        { error: 'Invalid input. Expected a non-empty string.' },
        { status: 400 }
      );
    }

    console.log(`📥 AI Route - Processing request from user ${userId.substring(0, 8)}...`);
    console.log(`📝 AI Route - Input: "${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"`);

    // Check user credits
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.credits || userData.credits < 10) {
      console.log(`⚠️ AI Route - User ${userId.substring(0, 8)} has insufficient credits: ${userData?.credits || 0}`);
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      );
    }

    console.log(`💳 AI Route - User ${userId.substring(0, 8)} has ${userData.credits} credits available`);

    // Get tasks from cached tasks if available or recent tasks from Firebase
    const tasksToUse = cachedTasks.length > 0 
      ? cachedTasks 
      : await fetchRecentTasks(userId);

    console.log(`📚 AI Route - Using ${tasksToUse.length} tasks for context`);

    try {
      // Run the agent conversation
      const result = await runAgentConversation(
        input, 
        existingCategories, 
        tasksToUse, 
        userId,
        conversationId
      );

      // Deduct credits based on tokens used
      const creditsUsed = await deductCredits(userId, result.tokensUsed);
      console.log(`💰 AI Route - Deducted ${creditsUsed} credits (${result.tokensUsed} tokens)`);

      // Return the final processed result to client
      console.log(`✅ AI Route - Returning result with ${result.actions.length} actions and ${result.messages.length} messages`);

      return NextResponse.json({
        data: {
          actions: result.actions,
          messages: result.messages,
          tokensUsed: result.tokensUsed,
          creditsUsed,
          conversationId: result.conversationId
        }
      });
    } catch (aiError) {
      console.error('❌ AI Route - Error in AI processing:', aiError);

      // If AI processing fails, return a fallback with error info
      return NextResponse.json(
        { 
          error: `AI processing error: ${aiError.message}`,
          data: {
            actions: [],
            messages: [`I'm sorry, I encountered an error: ${aiError.message}. Please try again.`],
            tokensUsed: 0,
            creditsUsed: 1,
            conversationId: conversationId
          }
        },
        { status: 200 } // Return 200 with error info in the response body
      );
    }
  } catch (error) {
    console.error('❌ AI Route - Error in API handler:', error);

    // Distinguish between different types of errors for better debugging
    let status = 500;
    let message = 'Internal server error';

    if (error instanceof SyntaxError) {
      status = 400;
      message = 'Invalid request format';
    } else if (error.code === 'permission-denied') {
      status = 403;
      message = 'Permission denied';
    } else if (error.code === 'not-found') {
      status = 404;
      message = 'Resource not found';
    }

    return NextResponse.json(
      { error: message, details: error.message },
      { status }
    );
  }
}

// Helper function to fetch recent tasks from Firebase
async function fetchRecentTasks(userId: string): Promise<any[]> {
  try {
    const recentTasksSnapshot = await db.collection('users')
      .doc(userId)
      .collection('notes')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
      
    return recentTasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Error fetching recent tasks:', error);
    return [];
  }
}