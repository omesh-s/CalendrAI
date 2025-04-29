// types/CommandItem.ts
export interface CommandItem {
    title: string;
    command: ({ editor, range }: { editor: any, range: any }) => void;
  }
  