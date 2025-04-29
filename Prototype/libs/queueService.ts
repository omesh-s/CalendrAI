import { categorizeNote, Task } from "./openai";

type QueueItem = {
  id: string;
  content: string;
  timestamp: number;
  conversationId?: string;
  onComplete: (result: any) => void;
  onError: (error: any) => void;
};

interface CategorizeNoteResponse {
  actions?: Array<{
    action: string;
    data: any;
  }>;
  results?: any[];
  messages?: string[];
  tokensUsed: number;
  creditsUsed: number;
  conversationId?: string;
}

class NoteProcessingQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private cachedNotes: Task[] = [];

  setCachedNotes(notes: Task[]) {
    this.cachedNotes = notes;
    console.log(`📚 Queue - Updated cached notes: ${this.cachedNotes.length} notes available`);
  }

  async add(item: QueueItem, existingCategories: string[]) {
    this.queue.push(item);
    if (!this.isProcessing) {
      this.processQueue(existingCategories);
    }
  }

  private async processQueue(existingCategories: string[]) {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift()!;

    try {
      const now = new Date();
      const clientDateTime = now.toLocaleString('en-US', { 
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
      });

      const result = await categorizeNote(
        item.content, 
        existingCategories, 
        { 
          skipClarityCheck: true,
          clientDateTime
        },
        null,
        this.cachedNotes,
        item.conversationId
      ) as CategorizeNoteResponse;

      // Process the result and call onComplete with the full result
      if (result.actions && result.actions.length > 0) {
        console.log('Processing actions from queue:', result.actions);
        item.onComplete(result);
      } else {
        // If no actions but we have results, still call onComplete
        item.onComplete(result);
      }
    } catch (error) {
      console.error('Error processing queue item:', error);
      item.onError(error);
    } finally {
      // Process next item in queue
      this.processQueue(existingCategories);
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const noteQueue = new NoteProcessingQueue(); 