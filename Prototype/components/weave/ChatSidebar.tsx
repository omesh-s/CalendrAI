import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, User, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: number;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  setConversationId: (id: string) => void;
  messages: ChatMessage[];
}

export function ChatSidebar({ 
  isOpen, 
  onClose, 
  conversationId, 
  setConversationId,
  messages = [] 
}: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Log conversation ID changes for debugging
  useEffect(() => {
    console.log('ChatSidebar - Conversation ID:', conversationId);
  }, [conversationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-80 md:w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">AI Assistant</h2>
          {conversationId && (
            <Badge variant="outline" className="text-xs ml-2">
              ID: {conversationId.substring(0, 6)}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[70vh] text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 text-muted" />
              <p className="text-center">No conversation history yet.</p>
              <p className="text-center text-sm mt-2">
                Type a command in the input bar below to start chatting with the AI assistant.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex gap-2 max-w-[85%] group">
                  {message.sender === 'assistant' && (
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </Avatar>
                  )}
                  <div className="flex flex-col">
                    <Card className={`p-3 ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg`}>
                      {message.sender === 'assistant' ? (
                        <div className="text-sm markdown-content prose prose-sm dark:prose-invert max-w-none prose-headings:mb-1 prose-headings:mt-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                          <ReactMarkdown>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      )}
                    </Card>
                    <div className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {format(new Date(message.timestamp), 'h:mm a')}
                    </div>
                  </div>
                  {message.sender === 'user' && (
                    <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground">
                      <User className="h-4 w-4" />
                    </Avatar>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Footer with hint */}
      <div className="p-3 border-t bg-muted/30 text-xs text-center text-muted-foreground">
        Use the command bar to chat with the AI assistant
      </div>
    </div>
  );
} 