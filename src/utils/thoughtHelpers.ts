import { Thought, ThoughtTag } from '../types';

// Generate a unique ID for a thought
export function generateThoughtId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Create a new thought from text
export function createThought(
  text: string,
  tags: ThoughtTag[] = [],
  durationSeconds: number = 0
): Thought {
  return {
    id: generateThoughtId(),
    timestamp: new Date().toISOString(),
    text: text.trim(),
    title: text.trim().substring(0, 50) + (text.trim().length > 50 ? '...' : ''),
    tags,
    pinned: false,
    durationSeconds,
  };
}

// Merge thoughts arrays, prioritizing Firebase thoughts
export function mergeThoughts(firebaseThoughts: Thought[], localThoughts: Thought[]): Thought[] {
  const firebaseMap = new Map(firebaseThoughts.map(t => [t.id, t]));
  
  // Add local thoughts that aren't in Firebase (unsynced)
  localThoughts.forEach(localThought => {
    if (!firebaseMap.has(localThought.id)) {
      firebaseThoughts.push(localThought);
    }
  });
  
  // Sort by timestamp (newest first)
  return firebaseThoughts.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

