import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Thought, ThoughtTag, User } from './types';
import { useSpeechRecognition } from './useSpeechRecognition';
import { deleteUser, signOut, onAuthStateChange } from './auth';
import ModeToggle from './ModeToggle';
import CaptureView from './CaptureView';
import { saveAllThoughts, migrateOldData, saveThoughtToLocalStorage, loadAllThoughtsFromLocalStorage } from './dataStorage';
import { subscribeToThoughts, saveThought, deleteThought } from './firebase/db';
import { migrateThoughtsToFirebase } from './firebase/migration';

// Lazy load heavy components for code splitting
const LandingPage = lazy(() => import('./LandingPage'));
const LibraryView = lazy(() => import('./LibraryView'));

// Global variable to store the full transcript - never trimmed
let finalTranscript = '';
// Track the last processed final text to prevent duplicates
let lastProcessedFinalText = '';

// Helper function to get last N words for display only
function getLastWords(text: string, count: number = 20): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return text.trim();
  return words.slice(words.length - count).join(' ');
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'capture' | 'library'>('capture');
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [selectedThoughtId, setSelectedThoughtId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<ThoughtTag | 'All'>('All');
  const [isListening, setIsListening] = useState(false);
  const [_elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('dreamdelusion:theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isListeningRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const finalTranscriptRef = useRef('');
  const unsubscribeThoughtsRef = useRef<(() => void) | null>(null);

  // Keep refs in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        
        // Migrate localStorage data to Firestore on first login
        try {
          const migrationResult = await migrateThoughtsToFirebase(user.id);
          if (migrationResult.success && migrationResult.migratedCount > 0) {
            setToastMessage(`Migrated ${migrationResult.migratedCount} thoughts to cloud`);
            setTimeout(() => setToastMessage(null), 5000);
          }
        } catch (error) {
          console.error('Migration error:', error);
        }
        
        // Set up real-time listener for thoughts
        if (unsubscribeThoughtsRef.current) {
          unsubscribeThoughtsRef.current();
        }
        
        unsubscribeThoughtsRef.current = subscribeToThoughts(user.id, (updatedThoughts) => {
          // Merge Firebase thoughts with localStorage thoughts
          // This ensures locally saved thoughts (that haven't synced yet) are also shown
          const localThoughts = loadAllThoughtsFromLocalStorage();
          
          // Create a map of Firebase thoughts by ID for quick lookup
          const firebaseThoughtsMap = new Map(updatedThoughts.map(t => [t.id, t]));
          
          // Add any local thoughts that aren't in Firebase yet (unsynced)
          localThoughts.forEach(localThought => {
            if (!firebaseThoughtsMap.has(localThought.id)) {
              updatedThoughts.push(localThought);
            }
          });
          
          // Sort by timestamp (newest first)
          updatedThoughts.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setThoughts(updatedThoughts);
        });
        
        // Also try to migrate old session data
        try {
          const migrated = migrateOldData();
          if (migrated.length > 0) {
            // Save migrated thoughts to Firestore
            await saveAllThoughts(migrated, user.id);
          }
        } catch (error) {
          console.error('Error migrating old data:', error);
        }
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setThoughts([]);
        
        // Unsubscribe from thoughts listener
        if (unsubscribeThoughtsRef.current) {
          unsubscribeThoughtsRef.current();
          unsubscribeThoughtsRef.current = null;
        }
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeThoughtsRef.current) {
        unsubscribeThoughtsRef.current();
      }
    };
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dreamdelusion:theme', theme);
  }, [theme]);

  // Timer
  useEffect(() => {
    if (isListening && recordingStartTimeRef.current) {
      timerIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
          setElapsedSeconds(elapsed);
        }
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
  }, [isListening]);

  const { start: startRecognition, stop: stopRecognition, isSupported } = useSpeechRecognition({
    onStart: () => {
      setIsListening(true);
      if (errorRef.current && errorRef.current.includes('Network')) {
        setError(null);
      }
    },
    onEnd: () => {
      // Don't auto-restart - user controls when to record
      setIsListening(false);
    },
    onError: (errorMsg: string) => {
      if (errorMsg === 'not-allowed' || errorMsg === 'service-not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
        setIsListening(false);
      } else if (errorMsg === 'network') {
        setError('Network error. Check your connection and try again.');
      } else if (errorMsg === 'no-speech') {
        // Normal - no speech detected
      } else if (errorMsg === 'aborted') {
        // Stopped intentionally
      } else if (errorMsg === 'audio-capture') {
        setError('No microphone found. Please connect a microphone.');
        setIsListening(false);
      } else {
        if (errorMsg !== 'bad-grammar' && errorMsg !== 'language-not-supported') {
          setError(`Error: ${errorMsg}`);
        }
      }
    },
    onResult: (transcript: string, isFinal: boolean) => {
      if (isFinal) {
        if (transcript.trim()) {
          // Accumulate final transcripts with proper spacing - NEVER trim the global variable
          const newText = transcript.trim();
          
          // Prevent duplicates: check if this exact text was just processed
          // Also check if it's already at the end of finalTranscript
          const isDuplicate = newText === lastProcessedFinalText || 
                             (finalTranscript && finalTranscript.endsWith(newText));
          
          if (!isDuplicate) {
            finalTranscript = finalTranscript 
              ? (finalTranscript + ' ' + newText).replace(/\s+/g, ' ').trim()
              : newText;
            
            // Track what we just processed
            lastProcessedFinalText = newText;
            
            // Update ref for backward compatibility
            finalTranscriptRef.current = finalTranscript;
            
            // Save full transcript to localStorage - NEVER trimmed
            localStorage.setItem('zenThoughts', finalTranscript);
          }
        }
        // When silent, show last 20 words of final transcript
        const tail = getLastWords(finalTranscript, 20);
        setLivePreview(tail || '');
      } else {
        // For interim results, show the interim text live
        if (transcript && transcript.trim()) {
          // When user is speaking, show interim live
          setLivePreview(transcript.trim());
        } else {
          // When silent, show last 20 words of final transcript
          const tail = getLastWords(finalTranscript, 20);
          setLivePreview(tail || '');
        }
      }
    },
  });

  const handleAuthSuccess = () => {
    // Auth state will be updated by the auth state listener
  };

  const handleSkip = () => {
    // Skip functionality removed - users must authenticate
    // This can be re-enabled if needed
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Auth state listener will handle the rest
      setThoughts([]);
      setSelectedThoughtId(null);
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    try {
      const result = await deleteUser();
      if (result.success) {
        setThoughts([]);
        setSelectedThoughtId(null);
        setShowDeleteConfirm(false);
        // Auth state listener will handle sign out
      } else {
        setError(result.error || 'Failed to delete account');
      }
    } catch (error: any) {
      console.error('Delete account error:', error);
      setError(error.message || 'Failed to delete account');
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  const handleStartCapture = async () => {
    const hasPermission = await requestMicrophonePermission();
    if (hasPermission) {
      finalTranscript = ''; // Reset global transcript
      lastProcessedFinalText = ''; // Reset duplicate tracking
      finalTranscriptRef.current = '';
      setLivePreview('');
      recordingStartTimeRef.current = Date.now();
      setElapsedSeconds(0);
      startRecognition();
    }
  };

  const handleStopCapture = async () => {
    stopRecognition();
    setIsListening(false);
    
    // Save thought if we have final transcript - use global finalTranscript (FULL text, never trimmed)
    const textToSave = finalTranscript.trim();
    if (textToSave && recordingStartTimeRef.current) {
      const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      // Apply selected tag if one was chosen (not "All")
      const tags: ThoughtTag[] = selectedTag !== 'All' ? [selectedTag] : [];
      
      const newThought: Thought = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        text: textToSave, // FULL transcript, never trimmed
        title: textToSave.substring(0, 50) + (textToSave.length > 50 ? '...' : ''),
        tags: tags,
        pinned: false,
        durationSeconds: duration,
      };
      
      // STEP 1: Save to localStorage FIRST (synchronously, immediately)
      // This ensures we never lose the transcript even if network fails
      const localSaveSuccess = saveThoughtToLocalStorage(newThought);
      
      if (!localSaveSuccess) {
        setError('Failed to save thought locally. Please try again.');
        // Don't reset transcript if local save failed
        return;
      }
      
      // Update UI immediately with locally saved thought
      // Add to thoughts state immediately so it shows up in library view right away
      setThoughts(prev => {
        // Check if thought already exists (shouldn't, but just in case)
        const exists = prev.find(t => t.id === newThought.id);
        if (exists) return prev;
        // Add new thought at the beginning
        return [newThought, ...prev];
      });
      
      setSelectedThoughtId(newThought.id);
      setMode('library');
      const tagMessage = tags.length > 0 ? ` · Tagged as ${tags[0]}` : '';
      setToastMessage(`Thought saved locally${tagMessage} · Syncing to cloud...`);
      setTimeout(() => setToastMessage(null), 3000);
      
      // STEP 2: Sync to Firebase in the background (async, non-blocking)
      // If user is authenticated, try to sync to cloud
      if (currentUser) {
        // Don't await - let it sync in background
        saveThought(newThought, currentUser.id)
          .then(() => {
            // Successfully synced to cloud
            console.log('Thought synced to Firebase successfully');
            // Update toast to indicate cloud sync completed
            setToastMessage(`Thought synced to cloud${tagMessage}`);
            setTimeout(() => setToastMessage(null), 2000);
          })
          .catch((error) => {
            // Failed to sync, but data is safe in localStorage
            console.error('Error syncing thought to Firebase:', error);
            // Show a non-critical warning - data is still saved locally
            setToastMessage(`Saved locally. Cloud sync failed - will retry later.`);
            setTimeout(() => setToastMessage(null), 4000);
          });
      }
    }
    
    // Reset everything only after local save succeeds
    finalTranscript = ''; // Reset global transcript
    lastProcessedFinalText = ''; // Reset duplicate tracking
    finalTranscriptRef.current = '';
    setLivePreview('');
    recordingStartTimeRef.current = null;
    setElapsedSeconds(0);
  };


  const handleUpdateThought = async (thought: Thought) => {
    if (!currentUser) return;
    
    try {
      await saveThought(thought, currentUser.id);
      // Real-time listener will update state
    } catch (error) {
      console.error('Error updating thought:', error);
      setError('Failed to update thought. Please try again.');
    }
  };

  const handleDeleteThought = async (id: string) => {
    if (!currentUser) return;
    
    try {
      await deleteThought(id, currentUser.id);
      // Real-time listener will update state
      if (selectedThoughtId === id) {
        setSelectedThoughtId(null);
      }
    } catch (error) {
      console.error('Error deleting thought:', error);
      setError('Failed to delete thought. Please try again.');
    }
  };

  const handleDeleteAllThoughts = async () => {
    if (!currentUser) return;
    
    try {
      // Delete all thoughts from Firestore
      const deletePromises = thoughts.map(thought => deleteThought(thought.id, currentUser.id));
      await Promise.all(deletePromises);
      // Real-time listener will update state
      setSelectedThoughtId(null);
      setToastMessage('All thoughts deleted');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting all thoughts:', error);
      setError('Failed to delete all thoughts. Please try again.');
    }
  };

  const handlePinThought = async (id: string) => {
    if (!currentUser) return;
    
    const thought = thoughts.find(t => t.id === id);
    if (!thought) return;
    
    try {
      const updatedThought = { ...thought, pinned: !thought.pinned };
      await saveThought(updatedThought, currentUser.id);
      // Real-time listener will update state
    } catch (error) {
      console.error('Error pinning thought:', error);
      setError('Failed to update thought. Please try again.');
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'var(--bg-core)',
        color: 'var(--text-primary)'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return (
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          backgroundColor: 'var(--bg-core)',
          color: 'var(--text-primary)'
        }}>
          <div>Loading...</div>
        </div>
      }>
        <LandingPage onAuthSuccess={handleAuthSuccess} onSkip={handleSkip} theme={theme} />
      </Suspense>
    );
  }

  return (
    <div className="app">
      {/* Top Bar with Mode Toggle */}
      <div className="app-top-bar">
        <div className="app-top-bar-left">
          <div ref={accountMenuRef} style={{ position: 'relative' }}>
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
                  {currentUser?.name || 'Guest User'}
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
                {currentUser ? (
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
        </div>

        <div className="app-top-bar-center">
          <ModeToggle mode={mode} onModeChange={setMode} />
        </div>

        <div className="app-top-bar-right"></div>
      </div>

      {/* Main Content */}
      <div className="app-main-content">
        {mode === 'capture' ? (
          <CaptureView
            isListening={isListening}
            livePreview={livePreview}
            onStartCapture={handleStartCapture}
            onStopCapture={handleStopCapture}
            speechSupported={speechSupported}
          />
        ) : (
          <Suspense fallback={
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              backgroundColor: 'var(--bg-core)',
              color: 'var(--text-primary)'
            }}>
              <div>Loading library...</div>
            </div>
          }>
            <LibraryView
              thoughts={thoughts}
              selectedThoughtId={selectedThoughtId}
              selectedTag={selectedTag}
              onSelectThought={setSelectedThoughtId}
              onUpdateThought={handleUpdateThought}
              onDeleteThought={handleDeleteThought}
              onDeleteAllThoughts={handleDeleteAllThoughts}
              onPinThought={handlePinThought}
              onStartCapture={() => setMode('capture')}
              onTagChange={setSelectedTag}
            />
          </Suspense>
        )}
      </div>

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

      {/* Toast Message */}
      {toastMessage && (
        <div className="toast-message">
          {toastMessage}
        </div>
      )}

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

