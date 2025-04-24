// Add this at the top of your file
export interface SpeechRecognition extends EventTarget {
    new (): SpeechRecognition;
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (event: Event) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionError) => void;
    onend: (event: Event) => void;
  }
  
  // Declare the SpeechRecognitionEvent and SpeechRecognitionError interfaces
 export interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }
  

  
  interface SpeechRecognitionError extends Event {
    error: string;
    message: string;
  }