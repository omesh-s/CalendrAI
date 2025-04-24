import { Priority } from '@/libs/constants';

export interface SubTask {
  id: string;
  parentId: string;
  content: string;
  completed?: boolean;
  completedAt?: string;
  priority?: Priority;
  estimatedTime?: string;
  subtasks?: SubTask[];
}

export interface Task {
  id: string;
  content: string;
  completed?: boolean;
  category: string;
  timestamp: number;
  priority?: Priority;
  subtasks?: SubTask[];
  dueDate?: string;
}

export interface Note {
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
  subtasks?: SubTask[];
  color?: string;
}

export interface CategoryResponse {
  category: string;
  isTask: boolean;
  priority: Priority | null;
  suggestedDueDate: string | null;
}

export interface ClarificationResponse {
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

export interface ExtendedCategoryResponse extends CategoryResponse {
  content?: string;
  clarificationNeeded: boolean;
  clarificationQuestion: string | null;
  enhancedContent?: string;
  tokensUsed: number;
}

export interface CategorizeOptions {
  skipClarityCheck?: boolean;
  clientDateTime?: string;
}

export type SortOption = 'none' | 'priority' | 'dueDate';

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: () => void;
}
