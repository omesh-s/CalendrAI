import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Edit2, Trash2, Plus, CheckCircle2, Circle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NoteCard } from "./NoteCard";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { priorityColors } from '@/libs/constants';
import { getRelativeTime } from '@/utils/time';
import { Priority } from "@/libs/constants";
import { priorityLevels } from '@/libs/constants'; // Ensure this path is correct

interface CategoryModalProps {
  category: string;
  notes: Array<{
    id: string;
    content: string;
    category: string;
    timestamp: number;
    isTask: boolean;
    completed?: boolean;
    priority?: Priority;
        labels?: string[];
    dueDate?: string;
  }>;
  onClose: () => void;
  onEdit: (newName: string) => void;
  onDelete: (id: string) => void;
  onToggleTask: (id: string) => void;
  onUpdateCategory: (noteId: string, newCategory: string) => void;
  onUpdateNote: (noteId: string, updates: Partial<{ priority: Priority }>) => void;
  allCategories: string[];
}

export function CategoryModal({
  category,
  notes,
  onClose,
  onEdit,
  onDelete,
  onToggleTask,
  onUpdateCategory,
  onUpdateNote,
  allCategories
}: CategoryModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const handleSaveCategory = () => {
    if (newCategoryName.trim() && newCategoryName !== category) {
      onEdit(newCategoryName);
    }
    setIsEditing(false);
  };

  const cyclePriority = (noteId: string, currentPriority?: Priority) => {
    const currentIndex = currentPriority 
      ? priorityLevels.indexOf(currentPriority)
      : -1;
    const nextIndex = (currentIndex + 1) % priorityLevels.length;
    const newPriority = priorityLevels[nextIndex];
    
    onUpdateNote(noteId, { priority: newPriority });
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="h-9"
                />
                <Button onClick={handleSaveCategory} size="sm">Save</Button>
                <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm">Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <DialogTitle className="text-2xl">{category}</DialogTitle>
                <Button onClick={() => {
                  setNewCategoryName(category);
                  setIsEditing(true);
                }} variant="ghost" size="sm">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="p-3">
            <div className="text-2xl font-bold">{notes.filter(n => n.isTask).length}</div>
            <div className="text-sm text-muted-foreground">Tasks</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold">{notes.filter(n => !n.isTask).length}</div>
            <div className="text-sm text-muted-foreground">Notes</div>
          </Card>
        </div>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Tasks Section */}
            {notes.filter(n => n.isTask).length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tasks</h3>
                {notes.filter(n => n.isTask).map(note => (
                  <Card key={note.id} className="p-4 mb-2 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => onToggleTask(note.id)}
                      >
                        {note.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </Button>
                      <span className={`flex-1 ${note.completed ? "line-through text-muted-foreground" : ""}`}>
                        {note.content}
                      </span>
                      {note.priority && (
                        <Badge 
                          className={`capitalize cursor-pointer transition-colors duration-200 ${
                            priorityColors.badge[note.priority]
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            cyclePriority(note.id, note.priority);
                          }}
                        >
                          {note.priority}
                        </Badge>
                      )}
                      {note.dueDate && (
                        <span 
                          className={`text-xs font-medium due-date-background ${
                            getRelativeTime(note.dueDate)?.color || 'text-muted-foreground'
                          }`}
                        >
                          {getRelativeTime(note.dueDate)?.text}
                        </span>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setEditingNoteId(note.id)}>
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
                                    variant={cat === category ? "secondary" : "ghost"}
                                    onClick={() => {
                                      onUpdateCategory(note.id, cat);
                                      setEditingNoteId(null);
                                    }}
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
                                  if (newCategoryName.trim()) {
                                    allCategories.push(newCategoryName);
                                    if (editingNoteId) {
                                      onUpdateCategory(editingNoteId, newCategoryName);
                                    }
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
                      <Button variant="ghost" size="sm" onClick={() => onDelete(note.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Notes Section */}
            {notes.filter(n => !n.isTask).length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                {notes.filter(n => !n.isTask).map(note => (
                  <div key={note.id} className="mb-2">
                    <NoteCard
                      note={note}
                      onDelete={onDelete}
                      onUpdateCategory={onUpdateCategory}
                      allCategories={allCategories}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 