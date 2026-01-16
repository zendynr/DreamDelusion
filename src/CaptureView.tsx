import { useState, useEffect, useRef } from 'react';
import { useVoiceRecording } from './hooks/useVoiceRecording';
import { useScreenRecording } from './hooks/useScreenRecording';
import { animations } from './utils/animations';
import { useHoverAnimation } from './hooks/useGSAP';

type RecordingMode = 'transcription' | 'voice' | 'screen';

interface CaptureViewProps {
  isListening: boolean;
  livePreview: string;
  elapsedSeconds: number;
  onStartCapture: () => void;
  onStopCapture: () => void;
  speechSupported: boolean;
  onVoiceRecorded?: (audioBlob: Blob, duration: number) => void;
  onScreenRecorded?: (videoBlob: Blob, duration: number, transcript?: string) => void;
  onStartScreenRecording?: () => void; // Callback to start transcription when screen recording starts
  onStopScreenRecording?: () => Promise<string>; // Callback to stop transcription and return final transcript
}

export default function CaptureView({
  isListening,
  livePreview,
  elapsedSeconds,
  onStartCapture,
  onStopCapture,
  speechSupported,
  onVoiceRecorded,
  onScreenRecorded,
  onStartScreenRecording,
  onStopScreenRecording,
}: CaptureViewProps) {
  const [isMicEnabled, setIsMicEnabled] = useState(true); // Track if mic is enabled during screen recording
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const screenButtonRef = useRef<HTMLButtonElement>(null);
  const micToggleRef = useRef<HTMLButtonElement>(null);
  const screenStartButtonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const transcriptionRef = useRef<HTMLDivElement>(null);
  
  const micHover = useHoverAnimation(1.05, 0.2);
  const screenHover = useHoverAnimation(1.05, 0.2);
  const micToggleHover = useHoverAnimation(1.15, 0.2);
  const screenStartHover = useHoverAnimation(1.1, 0.2);

  // Animate mic button on mount
  useEffect(() => {
    if (micButtonRef.current && !isScreenRecording) {
      animations.scaleIn(micButtonRef.current, 0.1);
    }
  }, [isScreenRecording]);

  // Animate screen recording controls when they appear
  useEffect(() => {
    if (isScreenRecording) {
      if (screenButtonRef.current) {
        animations.scaleIn(screenButtonRef.current, 0);
      }
      if (micToggleRef.current) {
        animations.fadeInUp(micToggleRef.current, 0.2);
      }
    }
  }, [isScreenRecording]);

  // Animate timer when recording starts
  useEffect(() => {
    if (isAnyRecording && timerRef.current) {
      animations.fadeInUp(timerRef.current, 0);
    }
  }, [isAnyRecording]);

  // Animate transcription when it appears
  useEffect(() => {
    if (isListening && transcriptionRef.current) {
      animations.fadeInUp(transcriptionRef.current, 0.1);
    }
  }, [isListening]);
  
  const {
    isRecording: isVoiceRecording,
    duration: voiceDuration,
    error: voiceError,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    isSupported: voiceSupported,
  } = useVoiceRecording({
    onStop: (audioBlob, duration) => {
      onVoiceRecorded?.(audioBlob, duration);
    },
    onError: (error) => {
      console.error('Voice recording error:', error);
    },
  });

  const {
    isRecording: isScreenRecording,
    duration: screenDuration,
    error: screenError,
    startRecording: startScreenRecording,
    stopRecording: stopScreenRecording,
    isSupported: screenSupported,
  } = useScreenRecording({
    includeAudio: true,
    onStart: () => {
      // Start transcription if mic is enabled
      if (isMicEnabled) {
        onStartScreenRecording?.();
      }
    },
    onStop: async (videoBlob, duration) => {
      // Stop transcription if it was running
      const finalTranscript = isMicEnabled ? (await onStopScreenRecording?.() || '') : '';
      onScreenRecorded?.(videoBlob, duration, finalTranscript);
      setIsMicEnabled(true); // Reset for next recording
    },
    onError: (error) => {
      console.error('Screen recording error:', error);
      // Stop transcription on error
      if (isMicEnabled) {
        onStopScreenRecording?.();
      }
    },
  });

  const isAnyRecording = isListening || isVoiceRecording || isScreenRecording;
  const currentDuration = isScreenRecording ? screenDuration : elapsedSeconds;

  // Main mic button - for transcription only
  const handleToggle = () => {
    if (isListening) {
      onStopCapture();
    } else {
      onStartCapture();
    }
  };

  // Screen recording toggle
  const handleScreenToggle = () => {
    if (isScreenRecording) {
      stopScreenRecording();
    } else {
      startScreenRecording();
    }
  };

  // Toggle mic during screen recording
  const handleMicToggle = () => {
    if (isScreenRecording) {
      if (isMicEnabled) {
        // Stop transcription
        onStopScreenRecording?.();
        setIsMicEnabled(false);
      } else {
        // Start transcription
        onStartScreenRecording?.();
        setIsMicEnabled(true);
      }
    }
  };

  // Split live preview into words for word-by-word animation
  const words = livePreview.trim().split(/\s+/).filter(word => word.length > 0);

  // Format timer as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const MicIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: `${size}px`, height: `${size}px` }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );

  const ScreenIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: `${size}px`, height: `${size}px` }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.57.393A9.065 9.065 0 0021.75 12c0-2.278-.5-4.425-1.38-6.37M5 14.5l-1.38-6.37A9.065 9.065 0 002.25 12c0 2.278.5 4.425 1.38 6.37M5 14.5v6.75m0 0h13.5m-13.5 0H5m13.5 0v-6.75M5 14.5H3.75m13.5 0H20.25" />
    </svg>
  );

  return (
    <div className="capture-view-simple">
      {/* Error Messages */}
      {(voiceError || screenError) && (
        <div style={{
          color: 'var(--error-color, #ef4444)',
          textAlign: 'center',
          marginBottom: '16px',
          fontSize: '0.875rem',
        }}>
          {voiceError || screenError}
        </div>
      )}

      {/* Main Mic Button - Only for transcription */}
      {!isScreenRecording && (
        <button
          ref={micButtonRef}
          className={`mic-button-simple ${isListening ? 'active' : ''}`}
          onClick={handleToggle}
          disabled={!speechSupported}
          aria-label={isListening ? 'Stop Recording' : 'Start Recording'}
          onMouseEnter={micHover.onMouseEnter}
          onMouseLeave={micHover.onMouseLeave}
        >
          {isListening ? (
            <div className="mic-button-pulse">
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <MicIcon />
            </div>
          ) : (
            <MicIcon />
          )}
        </button>
      )}

      {/* Screen Recording Controls */}
      {isScreenRecording && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <button
            ref={screenButtonRef}
            className={`mic-button-simple active`}
            onClick={handleScreenToggle}
            aria-label="Stop Screen Recording"
            style={{
              background: 'var(--error-color, #ef4444)',
            }}
            onMouseEnter={screenHover.onMouseEnter}
            onMouseLeave={screenHover.onMouseLeave}
          >
            <div className="mic-button-pulse">
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <ScreenIcon />
            </div>
          </button>

          {/* Minimal Mic Toggle Button */}
          <button
            ref={micToggleRef}
            onClick={() => {
              animations.pulse(micToggleRef.current!, 0.9);
              handleMicToggle();
            }}
            aria-label={isMicEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid var(--border-color, rgba(255,255,255,0.2))',
              background: isMicEnabled 
                ? 'var(--accent-color, rgba(59, 130, 246, 0.2))' 
                : 'transparent',
              color: isMicEnabled 
                ? 'var(--accent-color, #3b82f6)' 
                : 'var(--text-secondary, rgba(255,255,255,0.5))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '0',
            }}
            onMouseEnter={micToggleHover.onMouseEnter}
            onMouseLeave={micToggleHover.onMouseLeave}
          >
            {isMicEnabled ? (
              <MicIcon size={20} />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14" strokeWidth="2.5" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Screen Recording Start Button - Small, minimal */}
      {!isAnyRecording && screenSupported && (
        <button
          ref={screenStartButtonRef}
          onClick={handleScreenToggle}
          aria-label="Start Screen Recording"
          style={{
            marginTop: '24px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1px solid var(--border-color, rgba(255,255,255,0.2))',
            background: 'var(--bg-secondary, rgba(0,0,0,0.1))',
            color: 'var(--text-secondary, rgba(255,255,255,0.7))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={(e) => {
            screenStartHover.onMouseEnter();
            e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.2))';
            e.currentTarget.style.color = 'var(--text-primary, rgba(255,255,255,0.9))';
          }}
          onMouseLeave={(e) => {
            screenStartHover.onMouseLeave();
            e.currentTarget.style.background = 'var(--bg-secondary, rgba(0,0,0,0.1))';
            e.currentTarget.style.color = 'var(--text-secondary, rgba(255,255,255,0.7))';
          }}
        >
          <ScreenIcon size={20} />
        </button>
      )}
      
      {/* Timer */}
      {isAnyRecording && (
        <div ref={timerRef} className="recording-timer" style={{
          textAlign: 'center',
          marginTop: '16px',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
          fontWeight: '500'
        }}>
          {formatTime(currentDuration)}
        </div>
      )}

      {/* Transcription Display */}
      {isListening && (
        <div ref={transcriptionRef} className="live-transcription">
          <div className="live-transcription-words">
            {words.length > 0 ? (
              words.map((word, index) => {
                const isCurrent = index === words.length - 1;
                return (
                  <span
                    key={`${word}-${index}-${Date.now()}`}
                    className={`live-word ${isCurrent ? 'live-word-current' : 'live-word-past'}`}
                  >
                    {word}
                  </span>
                );
              })
            ) : (
              <span className="live-word-placeholder">Listening...</span>
            )}
          </div>
        </div>
      )}

      {/* Screen Recording Status */}
      {isScreenRecording && (
        <div style={{
          textAlign: 'center',
          marginTop: '16px',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
        }}>
          Recording screen{isMicEnabled ? ' with audio' : ''}...
        </div>
      )}
    </div>
  );
}

