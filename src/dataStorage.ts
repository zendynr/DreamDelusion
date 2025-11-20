import { Thought } from './types';
import { loadAllThoughts as loadFromFirestore, saveAllThoughts as saveToFirestore } from './firebase/db';

const THOUGHTS_KEY = 'dreamdelusion:thoughts';

// Load all thoughts from Firestore (if userId provided) or localStorage (for migration)
export async function loadAllThoughts(userId?: string): Promise<Thought[]> {
  // If userId provided, load from Firestore
  if (userId) {
    try {
      return await loadFromFirestore(userId);
    } catch (error) {
      console.error('Error loading thoughts from Firestore:', error);
      // Fallback to localStorage if Firestore fails
      return loadAllThoughtsFromLocalStorage();
    }
  }
  
  // Otherwise, load from localStorage (for migration)
  return loadAllThoughtsFromLocalStorage();
}

// Load all thoughts from localStorage (for migration purposes)
export function loadAllThoughtsFromLocalStorage(): Thought[] {
  try {
    const stored = localStorage.getItem(THOUGHTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old format if needed
      return parsed.map((t: any) => {
        if (!t.tags) t.tags = [];
        if (t.pinned === undefined) t.pinned = false;
        if (!t.durationSeconds) t.durationSeconds = 0;
        if (!t.title) t.title = t.text?.substring(0, 50) || '';
        return t;
      });
    }
  } catch (e) {
    console.error('Error loading thoughts from localStorage:', e);
  }
  return [];
}

// Save all thoughts to Firestore (if userId provided) or localStorage (for migration)
export async function saveAllThoughts(thoughts: Thought[], userId?: string): Promise<void> {
  // If userId provided, save to Firestore
  if (userId) {
    try {
      await saveToFirestore(thoughts, userId);
      return;
    } catch (error) {
      console.error('Error saving thoughts to Firestore:', error);
      throw error;
    }
  }
  
  // Otherwise, save to localStorage (for migration)
  saveAllThoughtsToLocalStorage(thoughts);
}

// Save all thoughts to localStorage (for migration purposes)
export function saveAllThoughtsToLocalStorage(thoughts: Thought[]) {
  try {
    localStorage.setItem(THOUGHTS_KEY, JSON.stringify(thoughts));
  } catch (e) {
    console.error('Error saving thoughts to localStorage:', e);
  }
}

// Save a single thought to localStorage (local-first approach)
export function saveThoughtToLocalStorage(thought: Thought) {
  try {
    const existing = loadAllThoughtsFromLocalStorage();
    // Remove existing thought with same ID if present, then add new one at the beginning
    const filtered = existing.filter(t => t.id !== thought.id);
    const updated = [thought, ...filtered];
    localStorage.setItem(THOUGHTS_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error('Error saving thought to localStorage:', e);
    return false;
  }
}

// Migrate old session-based data to new thought-based format
export function migrateOldData(): Thought[] {
  try {
    const oldSessionsKey = 'thoughtTimer:sessions';
    const stored = localStorage.getItem(oldSessionsKey);
    if (!stored) return [];

    const sessions = JSON.parse(stored);
    const allThoughts: Thought[] = [];

    sessions.forEach((session: any) => {
      if (session.thoughts && Array.isArray(session.thoughts)) {
        session.thoughts.forEach((oldThought: any) => {
          const newThought: Thought = {
            id: oldThought.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: oldThought.timestamp || session.startedAt || new Date().toISOString(),
            text: oldThought.text || '',
            title: oldThought.text?.substring(0, 50) || '',
            tags: [],
            pinned: false,
            durationSeconds: 0, // We don't have this info from old format
          };
          allThoughts.push(newThought);
        });
      }
    });

    if (allThoughts.length > 0) {
      // Save migrated thoughts
      saveAllThoughts(allThoughts);
      // Optionally clear old data
      // localStorage.removeItem(oldSessionsKey);
    }

    return allThoughts;
  } catch (e) {
    console.error('Error migrating old data:', e);
    return [];
  }
}

