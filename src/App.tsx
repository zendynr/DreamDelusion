import { useState, useEffect, useRef } from 'react';
import { Thought, Session, ChatMessage, ChatThread } from './types';
import { useSpeechRecognition } from './useSpeechRecognition';
import { getCurrentUser, deleteUser, signOut } from './auth';
import LandingPage from './LandingPage';
import AccountManagement from './AccountManagement';

const SESSIONS_KEY = 'thoughtTimer:sessions';
const CURRENT_SESSION_KEY = 'thoughtTimer:currentSessionId';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeOffset(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Load all sessions
function loadAllSessions(): Session[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading sessions:', e);
  }
  return [];
}

// Save all sessions
function saveAllSessions(sessions: Session[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving sessions:', e);
  }
}

// Load current session
function loadSession(): Session | null {
  try {
    const currentId = localStorage.getItem(CURRENT_SESSION_KEY);
    if (currentId) {
      const sessions = loadAllSessions();
      return sessions.find(s => s.id === currentId) || null;
    }
    // Fallback: load the most recent session
    const sessions = loadAllSessions();
    if (sessions.length > 0) {
      const sorted = sessions.sort((a, b) => 
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      return sorted[0];
    }
  } catch (e) {
    console.error('Error loading session:', e);
  }
  return null;
}

// Save a session (adds or updates in the sessions array)
function saveSession(session: Session | null) {
  if (session) {
    try {
      const sessions = loadAllSessions();
      const index = sessions.findIndex(s => s.id === session.id);
      
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }
      
      // Sort by startedAt (newest first)
      sessions.sort((a, b) => 
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      
      saveAllSessions(sessions);
      localStorage.setItem(CURRENT_SESSION_KEY, session.id);
    } catch (e) {
      console.error('Error saving session:', e);
    }
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [livePreview, setLivePreview] = useState('');
  const [interimText, setInterimText] = useState('');
  const [viewMode, setViewMode] = useState<'thoughts' | 'chat' | 'history' | 'account'>('chat');
  const [sessionsHistory, setSessionsHistory] = useState<Session[]>([]);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('dreamdelusion:theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const isListeningRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const transcriptionAreaRef = useRef<HTMLDivElement | null>(null);
  const chatAreaRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  
  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  // Auto-scroll transcription area when new thoughts are added
  useEffect(() => {
    if (transcriptionAreaRef.current && session && session.thoughts.length > 0) {
      transcriptionAreaRef.current.scrollTop = transcriptionAreaRef.current.scrollHeight;
    }
  }, [session?.thoughts.length, interimText]);

  // Auto-scroll chat area when new messages are added
  useEffect(() => {
    const currentThread = getCurrentThread();
    if (chatAreaRef.current && currentThread && currentThread.messages.length > 0) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [session?.currentThreadId, session?.threads]);

  // Thread management functions
  const getCurrentThread = (): ChatThread | null => {
    if (!session || !session.currentThreadId) return null;
    return session.threads.find(t => t.threadId === session.currentThreadId) || null;
  };

  const createNewThread = () => {
    if (!session) return;
    
    const newThread: ChatThread = {
      threadId: 'thread-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: 'New chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    
    const updatedSession: Session = {
      ...session,
      threads: [...session.threads, newThread],
      currentThreadId: newThread.threadId,
    };
    
    setSession(updatedSession);
    saveSession(updatedSession);
  };

  const switchThread = (threadId: string) => {
    if (!session) return;
    
    const updatedSession: Session = {
      ...session,
      currentThreadId: threadId,
    };
    
    setSession(updatedSession);
    saveSession(updatedSession);
  };

  const deleteThread = (threadId: string) => {
    if (!session) return;
    
    if (window.confirm('Delete this thread? This cannot be undone.')) {
      const updatedThreads = session.threads.filter(t => t.threadId !== threadId);
      let newCurrentThreadId = session.currentThreadId;
      
      // If deleting current thread, switch to another or create new
      if (threadId === session.currentThreadId) {
        if (updatedThreads.length > 0) {
          newCurrentThreadId = updatedThreads[0].threadId;
        } else {
          newCurrentThreadId = undefined;
        }
      }
      
      const updatedSession: Session = {
        ...session,
        threads: updatedThreads,
        currentThreadId: newCurrentThreadId,
      };
      
      setSession(updatedSession);
      saveSession(updatedSession);
    }
  };

  const addMessageToThread = (threadId: string, message: ChatMessage) => {
    if (!session) return;
    
    const updatedThreads = session.threads.map(thread => {
      if (thread.threadId === threadId) {
        const updatedMessages = [...thread.messages, message];
        // Update title if it's still "New chat" and this is the first user message
        let title = thread.title;
        if (title === 'New chat' && message.role === 'user') {
          title = message.text.length > 50 
            ? message.text.substring(0, 50) + '...' 
            : message.text;
        }
        
        return {
          ...thread,
          messages: updatedMessages,
          title,
          updatedAt: new Date().toISOString(),
        };
      }
      return thread;
    });
    
    const updatedSession: Session = {
      ...session,
      threads: updatedThreads,
    };
    
    setSession(updatedSession);
    saveSession(updatedSession);
  };

  const { start: startRecognition, stop: stopRecognition, isSupported } = useSpeechRecognition({
    onStart: () => {
      setIsListening(true);
      // Clear network errors when recognition starts successfully
      if (errorRef.current && errorRef.current.includes('Network')) {
        setError(null);
      }
    },
    onEnd: () => {
      // Auto-restart if we have an active session and are supposed to be listening
      if (sessionRef.current && !sessionRef.current.endedAt && isListeningRef.current) {
        // Small delay to prevent rapid restart loops
        setTimeout(() => {
          // Double-check session is still active before restarting
          if (sessionRef.current && !sessionRef.current.endedAt && isListeningRef.current) {
            try {
              startRecognition();
            } catch (e) {
              console.log('Auto-restart error (will retry):', e);
              // Retry after a longer delay if immediate restart fails
              setTimeout(() => {
                if (sessionRef.current && !sessionRef.current.endedAt && isListeningRef.current) {
                  try {
                    startRecognition();
                  } catch (e2) {
                    console.error('Failed to restart recognition:', e2);
                  }
                }
              }, 500);
            }
          }
        }, 100);
      }
    },
    onError: (errorMsg: string) => {
      if (errorMsg === 'not-allowed' || errorMsg === 'service-not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
        setIsListening(false);
      } else if (errorMsg === 'network') {
        // Network errors are often temporary - don't show error immediately
        // Just try to restart silently
        setTimeout(() => {
          if (sessionRef.current && !sessionRef.current.endedAt && isListeningRef.current) {
            try {
              startRecognition();
            } catch (e) {
              // If restart fails, then show error
              setError('Network error. Check your connection and try again.');
            }
          }
        }, 1000);
      } else if (errorMsg === 'no-speech') {
        // This is normal - just means no speech detected, keep listening
        // Don't show error or stop
      } else if (errorMsg === 'aborted') {
        // Recognition was stopped intentionally, don't show error
      } else if (errorMsg === 'audio-capture') {
        setError('No microphone found. Please connect a microphone.');
        setIsListening(false);
      } else {
        // For other errors, show but don't stop listening if it's recoverable
        if (errorMsg !== 'bad-grammar' && errorMsg !== 'language-not-supported') {
          setError(`Error: ${errorMsg}`);
        }
      }
    },
    onResult: (transcript: string, isFinal: boolean) => {
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.endedAt) return;

      if (isFinal) {
        // Final result - save as a new thought and add to chat thread
        if (transcript.trim()) {
          const startTime = new Date(currentSession.startedAt).getTime();
          const now = Date.now();
          const timeOffset = Math.floor((now - startTime) / 1000);
          
          const newThought: Thought = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timeOffsetSeconds: timeOffset,
            timestamp: new Date().toISOString(),
            text: transcript.trim(),
          };

          // Ensure we have a current thread - create one if needed
          let updatedSession = { ...currentSession };
          if (!updatedSession.currentThreadId || updatedSession.threads.length === 0) {
            const newThread: ChatThread = {
              threadId: 'thread-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
              title: 'New chat',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: [],
            };
            updatedSession.threads = [...updatedSession.threads, newThread];
            updatedSession.currentThreadId = newThread.threadId;
          }

          // Always add to current thread (not just in chat mode)
          if (updatedSession.currentThreadId) {
            const userMessage: ChatMessage = {
              id: 'msg-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
              role: 'user',
              text: transcript.trim(),
              timestamp: new Date().toISOString(),
              thoughtId: newThought.id,
            };
            
            // Update the thread with the new message
            const updatedThreads = updatedSession.threads.map(thread => {
              if (thread.threadId === updatedSession.currentThreadId) {
                const updatedMessages = [...thread.messages, userMessage];
                // Update title if it's still "New chat" and this is the first user message
                let title = thread.title;
                if (title === 'New chat' && userMessage.role === 'user') {
                  title = userMessage.text.length > 50 
                    ? userMessage.text.substring(0, 50) + '...' 
                    : userMessage.text;
                }
                
                return {
                  ...thread,
                  messages: updatedMessages,
                  title,
                  updatedAt: new Date().toISOString(),
                };
              }
              return thread;
            });
            
            updatedSession.threads = updatedThreads;
          }

          updatedSession = {
            ...updatedSession,
            thoughts: [...updatedSession.thoughts, newThought],
          };

          setSession(updatedSession);
          sessionRef.current = updatedSession; // Update ref
          saveSession(updatedSession);
          // Update history
          setSessionsHistory(loadAllSessions());
        }
        
        // Clear interim text when we get final
        setInterimText('');
        setLivePreview('');
      } else {
        // Interim result - show live preview
        if (transcript && transcript.trim()) {
          setInterimText(transcript);
          setLivePreview(transcript);
        } else {
          // Empty interim means clear it
          setInterimText('');
          setLivePreview('');
        }
      }
    },
  });

  // Check authentication on mount
  useEffect(() => {
    const user = getCurrentUser();
    setIsAuthenticated(!!user);
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dreamdelusion:theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Load session and history on mount (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const allSessions = loadAllSessions();
    setSessionsHistory(allSessions);
    
    const loaded = loadSession();
    if (loaded && !loaded.endedAt) {
      // Resume ongoing session
      // Ensure threads array exists
      if (!loaded.threads) {
        loaded.threads = [];
      }
      // If no current thread but we have threads, select the first one
      if (!loaded.currentThreadId && loaded.threads.length > 0) {
        loaded.currentThreadId = loaded.threads[0].threadId;
      }
      // If no threads at all, create one
      if (loaded.threads.length === 0) {
        const newThread: ChatThread = {
          threadId: 'thread-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: 'New chat',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        };
        loaded.threads = [newThread];
        loaded.currentThreadId = newThread.threadId;
      }
      
      setSession(loaded);
      const startTime = new Date(loaded.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleSkip = () => {
    // Allow guest access without authentication
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    signOut();
    setIsAuthenticated(false);
    setSession(null);
    setDrawerOpen(false);
    setAccountMenuOpen(false);
  };

  const handleDeleteAccount = async () => {
    const user = getCurrentUser();
    if (!user) return;

    const result = deleteUser(user.id);
    if (result.success) {
      setIsAuthenticated(false);
      setSession(null);
      setDrawerOpen(false);
      setAccountMenuOpen(false);
      setShowDeleteConfirm(false);
    }
  };

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  // Sync sessions history when session changes
  useEffect(() => {
    if (viewMode === 'history') {
      setSessionsHistory(loadAllSessions());
    }
  }, [session, viewMode]);

  // Timer
  useEffect(() => {
    if (session && !session.endedAt && isListening) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (session.startedAt) {
            const startTime = new Date(session.startedAt).getTime();
            const now = Date.now();
            return Math.floor((now - startTime) / 1000);
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [session, isListening]);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setError(`Microphone error: ${error.message || 'Unknown error'}`);
      }
      return false;
    }
  };

  const handleStartSession = async () => {
    if (!session) {
      // Request microphone permission first
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }

      const newThread: ChatThread = {
        threadId: 'thread-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: 'New chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      
      const newSession: Session = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        startedAt: new Date().toISOString(),
        thoughts: [],
        threads: [newThread],
        currentThreadId: newThread.threadId,
      };
      setSession(newSession);
      sessionRef.current = newSession; // Update ref immediately
      setElapsedSeconds(0);
      saveSession(newSession);
      // Start recognition immediately
      startRecognition();
    } else {
      startRecognition();
    }
  };

  const handleToggleMic = async () => {
    if (!session) {
      await handleStartSession();
      return;
    }

    if (isListening) {
      stopRecognition();
      setIsListening(false);
    } else {
      // Request permission if needed before starting
      const hasPermission = await requestMicrophonePermission();
      if (hasPermission) {
        startRecognition();
      }
    }
  };

  const handleEndSession = () => {
    if (session && !session.endedAt) {
      stopRecognition();
      setIsListening(false);
      const endedSession: Session = {
        ...session,
        endedAt: new Date().toISOString(),
      };
      setSession(endedSession);
      saveSession(endedSession);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleDeleteThought = (thoughtId: string) => {
    if (!session) return;
    
    const updatedSession: Session = {
      ...session,
      thoughts: session.thoughts.filter(t => t.id !== thoughtId),
    };
    
    setSession(updatedSession);
    saveSession(updatedSession);
  };

  const handleClearAllThoughts = () => {
    if (!session) return;
    
    if (window.confirm('Clear all thoughts? This cannot be undone.')) {
      const updatedSession: Session = {
        ...session,
        thoughts: [],
      };
      
      setSession(updatedSession);
      saveSession(updatedSession);
    }
  };

  const handleNewSession = () => {
    if (session && !session.endedAt) {
      if (!window.confirm('Start a new session? The current session will be ended.')) {
        return;
      }
      handleEndSession();
    }
    
    const newThread: ChatThread = {
      threadId: 'thread-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: 'New chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    
    const newSession: Session = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      startedAt: new Date().toISOString(),
      thoughts: [],
      threads: [newThread],
      currentThreadId: newThread.threadId,
    };
    
    setSession(newSession);
    sessionRef.current = newSession;
    setElapsedSeconds(0);
    setIsListening(false);
    setError(null);
    saveSession(newSession);
  };

  const handleCopyAll = async () => {
    if (!session || session.thoughts.length === 0) {
      setCopyMessage('No thoughts to copy');
      setTimeout(() => setCopyMessage(null), 2000);
      return;
    }

    const startedAt = new Date(session.startedAt).toLocaleString();
    let text = `Session from ${startedAt}\n\n`;

    session.thoughts.forEach((thought) => {
      const offset = formatTimeOffset(thought.timeOffsetSeconds);
      text += `[${offset}] ${thought.text}\n`;
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('Copied to clipboard!');
      setTimeout(() => setCopyMessage(null), 2000);
    } catch (e) {
      setCopyMessage('Failed to copy');
      setTimeout(() => setCopyMessage(null), 2000);
    }
  };



  const handleSwitchSession = (sessionId: string) => {
    const allSessions = loadAllSessions();
    const targetSession = allSessions.find(s => s.id === sessionId);
    
    if (targetSession) {
      // End current session if it's active
      if (session && !session.endedAt) {
        handleEndSession();
      }
      
      // Load the selected session
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
      setSession(targetSession);
      sessionRef.current = targetSession;
      
      // Calculate elapsed time
      if (targetSession.endedAt) {
        const startTime = new Date(targetSession.startedAt).getTime();
        const endTime = new Date(targetSession.endedAt).getTime();
        setElapsedSeconds(Math.floor((endTime - startTime) / 1000));
      } else {
        const startTime = new Date(targetSession.startedAt).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
      }
      
      setIsListening(false);
      setError(null);
      setViewMode('chat');
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) {
      return;
    }
    
    const allSessions = loadAllSessions();
    const filtered = allSessions.filter(s => s.id !== sessionId);
    saveAllSessions(filtered);
    setSessionsHistory(filtered);
    
    // If we deleted the current session, load the most recent one or clear
    if (session && session.id === sessionId) {
      if (filtered.length > 0) {
        const sorted = filtered.sort((a, b) => 
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        handleSwitchSession(sorted[0].id);
      } else {
        setSession(null);
        sessionRef.current = null;
        setElapsedSeconds(0);
        localStorage.removeItem(CURRENT_SESSION_KEY);
      }
    }
  };

  const handleExportFile = () => {
    if (!session || session.thoughts.length === 0) {
      setCopyMessage('No thoughts to export');
      setTimeout(() => setCopyMessage(null), 2000);
      return;
    }

    const startedAt = new Date(session.startedAt).toLocaleString();
    let text = `Session from ${startedAt}\n\n`;

    session.thoughts.forEach((thought) => {
      const offset = formatTimeOffset(thought.timeOffsetSeconds);
      text += `[${offset}] ${thought.text}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoughts-${new Date(session.startedAt).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setCopyMessage('File downloaded!');
    setTimeout(() => setCopyMessage(null), 2000);
  };

  const speechSupported = isSupported();
  
  // Detect Brave browser
  const isBraveBrowser = () => {
    return (navigator as any).brave && (navigator as any).brave.isBrave instanceof Function
      ? (navigator as any).brave.isBrave().then((isBrave: boolean) => isBrave)
      : Promise.resolve(false);
  };
  
  const [browserInfo, setBrowserInfo] = useState<{ isBrave: boolean; speechBlocked: boolean } | null>(null);
  
  useEffect(() => {
    const checkBrowser = async () => {
      const braveCheck = await isBraveBrowser();
      const speechAvailable = isSupported();
      setBrowserInfo({
        isBrave: braveCheck,
        speechBlocked: braveCheck && !speechAvailable
      });
    };
    checkBrowser();
  }, []);
  
  const getAllThoughtsText = () => {
    if (!session) return '';
    return session.thoughts.map(t => t.text).join(' ') + (interimText ? ' ' + interimText : '');
  };

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LandingPage onAuthSuccess={handleAuthSuccess} onSkip={handleSkip} theme={theme} />
      </>
    );
  }

  return (
    <div className="app">
      {/* Main Interface */}
      <div className="center-stage">
        {/* Main Mic Toggle */}
        <button
          className={`mic-button ${isListening ? 'active' : ''}`}
          onClick={handleToggleMic}
          disabled={!speechSupported || browserInfo?.speechBlocked}
          aria-label="Toggle Microphone"
          title={browserInfo?.speechBlocked ? 'Web Speech API is blocked. Enable it in Brave settings.' : undefined}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        {/* Timer */}
        <div className={`timer ${session && (isListening || elapsedSeconds > 0) ? 'visible' : ''}`}>
          {session ? formatTimer(elapsedSeconds) : '00:00'}
        </div>

        {/* Live Preview */}
        <div className={`live-preview ${livePreview ? 'visible' : ''}`}>
          {livePreview}
        </div>
      </div>

      {/* Top Left: Account Icon with Dropdown */}
      <div ref={accountMenuRef} style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 30 }}>
        <button
          className="nav-btn nav-btn-left"
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          aria-label="Account Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>

        {accountMenuOpen && (
          <div className="account-dropdown">
            <div className="account-dropdown-header">
              {getCurrentUser()?.name || 'Guest User'}
            </div>
            <div className="account-dropdown-divider"></div>
            <button
              className="account-dropdown-item"
              onClick={() => {
                toggleTheme();
                setAccountMenuOpen(false);
              }}
            >
              {theme === 'dark' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light Mode
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark Mode
                </>
              )}
            </button>
            {getCurrentUser() ? (
              <>
                <button
                  className="account-dropdown-item"
                  onClick={handleSignOut}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
                <button
                  className="account-dropdown-item account-dropdown-item-danger"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setAccountMenuOpen(false);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Account
                </button>
              </>
            ) : (
              <button
                className="account-dropdown-item"
                onClick={handleSignOut}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Return to Login
              </button>
            )}
          </div>
        )}
      </div>

      {/* Top Right: Notes Toggle */}
      {session && (
        <button
          className="nav-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open Thoughts"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Drawer Overlay */}
      <div
        className={`drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Side Drawer */}
      <aside className={`drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
            <button
              className={`view-toggle ${viewMode === 'chat' ? 'active' : ''}`}
              onClick={() => setViewMode('chat')}
              style={{
                background: viewMode === 'chat' ? 'var(--bg-panel)' : 'transparent',
                border: '1px solid #27272a',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Chat
            </button>
            <button
              className={`view-toggle ${viewMode === 'thoughts' ? 'active' : ''}`}
              onClick={() => setViewMode('thoughts')}
              style={{
                background: viewMode === 'thoughts' ? 'var(--bg-panel)' : 'transparent',
                border: '1px solid #27272a',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Thoughts
            </button>
            <button
              className={`view-toggle ${viewMode === 'history' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('history');
                setSessionsHistory(loadAllSessions());
              }}
              style={{
                background: viewMode === 'history' ? 'var(--bg-panel)' : 'transparent',
                border: '1px solid #27272a',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              History
            </button>
          </div>
          <button
            className="nav-btn"
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'static', padding: '8px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {viewMode === 'chat' ? (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Threads Sidebar */}
            <div className="threads-sidebar">
              <button
                className="new-thread-btn"
                onClick={createNewThread}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '12px',
                  background: 'var(--bg-panel)',
                  border: '1px solid #27272a',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                + New Chat
              </button>
              
              <div className="threads-list">
                {session && session.threads.length > 0 ? (
                  session.threads
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map((thread) => (
                      <div
                        key={thread.threadId}
                        className={`thread-item ${session.currentThreadId === thread.threadId ? 'active' : ''}`}
                        onClick={() => switchThread(thread.threadId)}
                        style={{
                          padding: '10px 12px',
                          marginBottom: '4px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s',
                          background: session.currentThreadId === thread.threadId ? 'var(--bg-panel)' : 'transparent',
                          border: session.currentThreadId === thread.threadId ? '1px solid #27272a' : '1px solid transparent'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {thread.title}
                          </div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>
                            {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(thread.threadId);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px',
                            opacity: 0.5,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                ) : (
                  <div style={{ opacity: 0.3, textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>
                    No threads yet
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area and Input */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Chat Messages - Continuous Paragraph */}
              <div 
                className="chat-area"
                ref={chatAreaRef}
                style={{
                  padding: '24px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
              >
                {(() => {
                  const currentThread = getCurrentThread();
                  if (currentThread && currentThread.messages.length > 0) {
                    // Combine all messages into one continuous paragraph
                    const combinedText = currentThread.messages
                      .map(msg => msg.text)
                      .join(' ');
                    return combinedText;
                  } else {
                    return (
                      <div style={{ opacity: 0.3, textAlign: 'center', padding: '40px 20px' }}>
                        Start speaking to begin the conversation.
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        ) : viewMode === 'thoughts' ? (
          /* Text Area (Read Only) - Thoughts View */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div 
              className="transcription-area"
              ref={transcriptionAreaRef}
              style={{ flex: 1, marginBottom: 0 }}
            >
            {session && session.thoughts.length > 0 ? (
              <>
                {session.thoughts.map((thought) => (
                  <div key={thought.id} className="thought-item">
                    <span className="thought-time">{formatTimeOffset(thought.timeOffsetSeconds)}</span>
                    <span className="thought-text"> – {thought.text}</span>
                    <button
                      className="delete-thought"
                      onClick={() => handleDeleteThought(thought.id)}
                      title="Delete thought"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {interimText && (
                  <div className="thought-item">
                    <span className="thought-text" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                      {interimText}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <span style={{ opacity: 0.3 }}>No thoughts captured yet... Start speaking to transcribe your thoughts.</span>
            )}
            </div>
          </div>
        ) : viewMode === 'history' ? (
          /* Sessions History View */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto',
                padding: '12px 0'
              }}
            >
              {sessionsHistory.length > 0 ? (
                sessionsHistory.map((s) => {
                  const startDate = new Date(s.startedAt);
                  const endDate = s.endedAt ? new Date(s.endedAt) : null;
                  const duration = endDate 
                    ? Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
                    : null;
                  const isCurrent = session && session.id === s.id;
                  
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSwitchSession(s.id)}
                      style={{
                        padding: '16px',
                        marginBottom: '8px',
                        borderRadius: '8px',
                        background: isCurrent ? 'var(--bg-panel)' : 'transparent',
                        border: isCurrent ? '1px solid #27272a' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.background = 'var(--bg-panel)';
                          e.currentTarget.style.borderColor = '#27272a';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '0.9rem', 
                          color: 'var(--text-primary)',
                          fontWeight: isCurrent ? 500 : 400,
                          marginBottom: '4px'
                        }}>
                          {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--text-secondary)',
                          marginBottom: '4px'
                        }}>
                          {s.thoughts.length} thought{s.thoughts.length !== 1 ? 's' : ''} • {s.threads.length} thread{s.threads.length !== 1 ? 's' : ''}
                        </div>
                        {duration !== null && (
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--text-secondary)',
                            opacity: 0.7
                          }}>
                            Duration: {formatTimer(duration)}
                          </div>
                        )}
                        {!s.endedAt && (
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: '#fafafa',
                            opacity: 0.8,
                            marginTop: '4px'
                          }}>
                            Active
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(s.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          opacity: 0.5,
                          transition: 'opacity 0.2s',
                          marginLeft: '12px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                        title="Delete session"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div style={{ opacity: 0.3, textAlign: 'center', padding: '40px 20px' }}>
                  No sessions yet. Start a session to begin.
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'account' ? (
          <AccountManagement onSignOut={handleSignOut} />
        ) : null}

        {/* Action Buttons */}
        <div className="actions-grid">
          <button
            className="action-btn"
            onClick={handleCopyAll}
            disabled={!session || session.thoughts.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          <button
            className="action-btn"
            onClick={handleExportFile}
            disabled={!session || session.thoughts.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>

        {/* Secondary Tools */}
        <div className="secondary-actions">
          <button
            className="action-btn"
            style={{ flex: 1 }}
            onClick={handleNewSession}
          >
            {session && !session.endedAt ? 'New Session' : 'Start Session'}
          </button>
          <button
            className="action-btn"
            style={{ flex: 1, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            onClick={handleClearAllThoughts}
            disabled={!session || session.thoughts.length === 0}
          >
            Clear
          </button>
        </div>
      </aside>

      {/* Error Messages */}
      {error && (
        <div className="error-message" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          {error}
          <button
            className="error-dismiss"
            onClick={() => setError(null)}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {!speechSupported && (
        <div className="error-message" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, maxWidth: '90%', padding: '16px' }}>
          {browserInfo?.isBrave ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '12px', fontWeight: 500 }}>
                Web Speech API is blocked in Brave
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6', opacity: 0.9 }}>
                To enable speech recognition in Brave:
                <br />
                1. Go to <strong>brave://settings/privacy</strong>
                <br />
                2. Scroll to "Web Speech API"
                <br />
                3. Enable "Allow sites to use the Web Speech API"
                <br />
                4. Refresh this page
                <br />
                <br />
                Or use Microsoft Edge or Chrome for best compatibility.
              </div>
            </div>
          ) : (
            'Speech recognition is not supported in this browser. Please use Chrome, Edge, or enable Web Speech API in Brave settings.'
          )}
        </div>
      )}

      {/* Copy Message */}
      {copyMessage && <div className="copy-message">{copyMessage}</div>}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Account</h3>
            <p>Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.</p>
            <div className="modal-actions">
              <button
                className="account-button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="account-button danger"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

