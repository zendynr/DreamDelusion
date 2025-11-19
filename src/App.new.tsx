import { useState, useEffect, useRef } from 'react';
import { Thought } from './types';
import { useSpeechRecognition } from './useSpeechRecognition';
import { getCurrentUser, deleteUser, signOut } from './auth';
import LandingPage from './LandingPage';
import ModeToggle from './ModeToggle';
import CaptureView from './CaptureView';
import LibraryView from './LibraryView';
import { loadAllThoughts, saveAllThoughts, migrateOldData } from './dataStorage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mode, setMode] = useState<'capture' | 'library'>('capture');
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [selectedThoughtId, setSelectedThoughtId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('dreamdelusion:theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isListeningRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const finalTranscriptRef = useRef('');

  // Keep refs in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  // Check authentication on mount
  useEffect(() => {
    const user = getCurrentUser();
    setIsAuthenticated(!!user);
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dreamdelusion:theme', theme);
  }, [theme]);

  // Load thoughts on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Try to migrate old data first
    const migrated = migrateOldData();
    if (migrated.length > 0) {
      setThoughts(migrated);
    } else {
      const loaded = loadAllThoughts();
      setThoughts(loaded);
    }
  }, [isAuthenticated]);

  // Save thoughts whenever they change
  useEffect(() => {
    if (isAuthenticated && thoughts.length >= 0) {
      saveAllThoughts(thoughts);
    }
  }, [thoughts, isAuthenticated]);

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
      recordingStartTimeRef.current = Date.now();
      setElapsedSeconds(0);
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
          finalTranscriptRef.current = transcript.trim();
          setFinalTranscript(transcript.trim());
        }
        setLivePreview('');
      } else {
        if (transcript && transcript.trim()) {
          setLivePreview(transcript);
        } else {
          setLivePreview('');
        }
      }
    },
  });

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleSkip = () => {
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    signOut();
    setIsAuthenticated(false);
    setThoughts([]);
    setSelectedThoughtId(null);
  };

  const handleDeleteAccount = async () => {
    const user = getCurrentUser();
    if (!user) return;

    const result = deleteUser(user.id);
    if (result.success) {
      setIsAuthenticated(false);
      setThoughts([]);
      setSelectedThoughtId(null);
      setShowDeleteConfirm(false);
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
      finalTranscriptRef.current = '';
      setFinalTranscript('');
      setLivePreview('');
      startRecognition();
    }
  };

  const handleStopCapture = () => {
    stopRecognition();
    setIsListening(false);
    
    // Save thought if we have final transcript
    if (finalTranscriptRef.current.trim() && recordingStartTimeRef.current) {
      const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      const newThought: Thought = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        text: finalTranscriptRef.current.trim(),
        title: finalTranscriptRef.current.trim().substring(0, 50) + (finalTranscriptRef.current.length > 50 ? '...' : ''),
        tags: [],
        pinned: false,
        durationSeconds: duration,
      };
      
      setThoughts(prev => [newThought, ...prev]);
      setSelectedThoughtId(newThought.id);
      setMode('library');
      setToastMessage('Thought saved · Tap to view in Library');
      setTimeout(() => setToastMessage(null), 3000);
      
      finalTranscriptRef.current = '';
      setFinalTranscript('');
    }
    
    recordingStartTimeRef.current = null;
    setElapsedSeconds(0);
  };

  const handleThoughtSaved = (thought: Thought) => {
    setThoughts(prev => [thought, ...prev]);
    setSelectedThoughtId(thought.id);
    setMode('library');
    setToastMessage('Thought saved · Tap to view in Library');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateThought = (thought: Thought) => {
    setThoughts(prev => prev.map(t => t.id === thought.id ? thought : t));
  };

  const handleDeleteThought = (id: string) => {
    setThoughts(prev => prev.filter(t => t.id !== id));
    if (selectedThoughtId === id) {
      setSelectedThoughtId(null);
    }
  };

  const handlePinThought = (id: string) => {
    setThoughts(prev => prev.map(t => 
      t.id === id ? { ...t, pinned: !t.pinned } : t
    ));
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

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return (
      <LandingPage onAuthSuccess={handleAuthSuccess} onSkip={handleSkip} theme={theme} />
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
            elapsedSeconds={elapsedSeconds}
            livePreview={livePreview}
            finalTranscript={finalTranscript}
            onStartCapture={handleStartCapture}
            onStopCapture={handleStopCapture}
            onThoughtSaved={handleThoughtSaved}
            speechSupported={speechSupported}
            error={error}
          />
        ) : (
          <LibraryView
            thoughts={thoughts}
            selectedThoughtId={selectedThoughtId}
            onSelectThought={setSelectedThoughtId}
            onUpdateThought={handleUpdateThought}
            onDeleteThought={handleDeleteThought}
            onPinThought={handlePinThought}
            onStartCapture={() => setMode('capture')}
          />
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

