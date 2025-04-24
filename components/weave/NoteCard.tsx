import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { priorityColors } from '@/libs/constants';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import { useNotes } from '@/components/context/NotesProvider';
import { Note } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3]
    }
  }),
  Typography,
  Placeholder.configure({
    placeholder: 'Start writing...',
  }),
];

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  onUpdateCategory?: (noteId: string, newCategory: string) => void;
  allCategories?: string[];
}

export function NoteCard({ note, onDelete, onUpdateCategory, allCategories = [] }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { updateNote } = useNotes();

  const editor = useEditor({
    extensions,
    content: note.content || '',
    editable: isEditing,
    editorProps: {
      attributes: {
        class: 'prose prose-xs max-w-none focus:outline-none px-3 py-0 min-h-[40px] max-h-[50px] overflow-y-auto',
      },
    },
  });

  // Update editor content when note changes
  useEffect(() => {
    if (editor && note.content) {
      try {
        editor.commands.setContent(note.content);
      } catch (e) {
        editor.commands.setContent(note.content);
      }
    }
  }, [note.content, editor]);

  // Update editor's editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

  const handleSave = async () => {
    if (editor) {
      const content = editor.getHTML();
      await updateNote(note.id, { content });
      setIsEditing(false);
    }
  };

  return (
    <Card className="p-4 relative group hover:shadow-md transition-all">
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSave}
            >
              <Save className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(false)}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </>
        ) : (
          <>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Move to Category</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2">
                  {allCategories.length > 0 && (
                    <div className="max-h-60 overflow-y-auto">
                      {allCategories.map((cat) => (
                        <Button
                          key={cat}
                          variant={cat === note.category ? "secondary" : "ghost"}
                          onClick={() => {
                            if (onUpdateCategory) {
                              onUpdateCategory(note.id, cat);
                            }
                          }}
                          className="w-full justify-start"
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New Category"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="h-9 flex-1"
                    />
                    <Button 
                      onClick={() => {
                        if (newCategoryName.trim() && onUpdateCategory) {
                          onUpdateCategory(note.id, newCategoryName);
                          setNewCategoryName('');
                        }
                      }} 
                      variant="outline"
                      disabled={!newCategoryName.trim()}
                      className="h-9"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDelete(note.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-col h-full mt-6 pb-6">
        <div 
          className={`flex-grow mb-0 ${isEditing ? 'ring-2 ring-offset-2 ring-muted rounded-md' : ''}`}
          onClick={() => !isEditing && setIsEditing(true)}
        >
          <EditorContent 
            editor={editor} 
            className={`transition-colors [&_.ProseMirror]:text-sm [&_.ProseMirror]:leading-relaxed ${
              !isEditing ? 'cursor-pointer prose-p:my-1' : 'cursor-text'
            }`}
          />
        </div>

        <div className="flex flex-col gap-2 mt-auto border-dotted  pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{note.category}</span>
            {note.priority && (
              <Badge className={`capitalize ${priorityColors.badge[note.priority]}`}>
                {note.priority}
              </Badge>
            )}
          </div>

          {note.labels && note.labels.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {note.labels.map((label, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 