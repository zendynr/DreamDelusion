export type ThoughtTag = 'Idea' | 'Task' | 'Reflection' | 'Random';

/** Emotion used in constellation view for color and bonds */
export type EmotionKey = 'joy' | 'sadness' | 'anxiety' | 'hope' | 'love' | 'curiosity' | 'peace' | 'neutral';

/** Weighted emotion vector for blending (e.g. joy: 0.7, sadness: 0.3 → greenish). Sum typically 1. */
export type EmotionVector = Partial<Record<EmotionKey, number>>;

export type Thought = {
  id: string;
  timestamp: string; // ISO
  text: string;
  title?: string; // Auto-generated or user-edited
  tags: ThoughtTag[];
  pinned: boolean;
  durationSeconds: number; // Duration of the recording
  // Optional constellation view fields (persisted)
  /** Weighted emotions for color blending; takes precedence over emotion when present */
  emotionVector?: EmotionVector;
  /** Legacy single emotion; used when emotionVector not set (converted to vector for display) */
  emotion?: EmotionKey;
  x?: number;
  y?: number;
  size?: number;
  /** Computed from emotionVector when present; kept for backward compat / cache */
  color?: string;
  keywords?: string[];
};

export type ManualLink = { from: string; to: string };

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  thoughtId?: string; // Link to original thought if this is a user message
};

export type ChatThread = {
  threadId: string;
  title: string; // auto: "New chat" or first message excerpt
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export type Session = {
  id: string;
  startedAt: string;
  endedAt?: string;
  thoughts: Thought[];
  threads: ChatThread[]; // All chat threads
  currentThreadId?: string; // Currently active thread
};

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};


