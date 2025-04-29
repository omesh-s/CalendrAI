"use client"
import { openDB, DBSchema } from 'idb';
interface NotesDB extends DBSchema {
notes: {
key: string; // Note ID
value: {
id: string;
content: string;
category: string;
timestamp: number;
isTask: boolean;
completed?: boolean;
completedAt?: string;
priority?: string;
dueDate?: string;
labels?: string[];
subtasks?: any[];
};
indexes: { 'by-timestamp': number };
};
metadata: {
key: string;
value: any;
};
}
const DB_NAME = 'notes-app';
const DB_VERSION = 1;
const isBrowser = typeof window !== 'undefined';
const dbPromise = isBrowser ? openDB<NotesDB>(DB_NAME, DB_VERSION, {
upgrade(db) {
const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
notesStore.createIndex('by-timestamp', 'timestamp');
db.createObjectStore('metadata');
},
}) : null;
export const Cache = {
async addNote(note: any) {
if (!isBrowser) return;
const db = await dbPromise;
await db?.put('notes', note);
},
async addNotes(notes: any[]) {
if (!isBrowser) return;
const db = await dbPromise;
const tx = db?.transaction('notes', 'readwrite');
for (const note of notes) {
tx?.store.put(note);
}
await tx?.done;
},
async getNote(id: string) {
if (!isBrowser) return;
const db = await dbPromise;
return db.get('notes', id);
},
async getAllNotes(limit: number, startAfter?: number) {
if (!isBrowser) return;
const db = await dbPromise;
const tx = db.transaction('notes', 'readonly');
const index = tx.store.index('by-timestamp');
let notes: any[] = [];
if (startAfter) {
notes = await index.getAll(IDBKeyRange.upperBound(startAfter, true), limit);
} else {
notes = await index.getAll(null, limit);
}
await tx.done;
return notes;
},
async deleteNote(id: string) {
if (!isBrowser) return;
const db = await dbPromise;
await db.delete('notes', id);
},
async updateNote(id: string, updates: Partial<any>) {
if (!isBrowser) return;
const db = await dbPromise;
const note = await db.get('notes', id);
if (note) {
const updatedNote = { ...note, ...updates };
await db.put('notes', updatedNote);
}
},
async clearCache() {
    console.log("Clearing cache...");
    if (!isBrowser) return;

    const db = await dbPromise;

    if (db) {
        const tx = db.transaction(['notes', 'metadata'], 'readwrite');
        await tx.objectStore('notes').clear();     // Clear all records in 'notes'
        await tx.objectStore('metadata').clear();  // Clear all records in 'metadata'
        await tx.done; // Ensure the transaction completes
        console.log("Cache cleared successfully");
    } else {
        console.error("Failed to open the database.");
    }
}
,
async setCacheTimestamp(timestamp: number) {
if (!isBrowser) return;
const db = await dbPromise;
await db.put('metadata', timestamp, 'cacheTimestamp');
},
async getCacheTimestamp() {
if (!isBrowser) return;
const db = await dbPromise;
return db.get('metadata', 'cacheTimestamp');
},
};