export type Thought = {
  id: string;
  timeOffsetSeconds: number;
  timestamp: string; // ISO
  text: string;
};

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


