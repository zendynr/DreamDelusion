import { Thought } from './types';

const THOUGHTS_KEY = 'dreamdelusion:thoughts';

// Load all thoughts from localStorage
export function loadAllThoughts(): Thought[] {
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
    console.error('Error loading thoughts:', e);
  }
  return [];
}

// Save all thoughts to localStorage
export function saveAllThoughts(thoughts: Thought[]) {
  try {
    localStorage.setItem(THOUGHTS_KEY, JSON.stringify(thoughts));
  } catch (e) {
    console.error('Error saving thoughts:', e);
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

