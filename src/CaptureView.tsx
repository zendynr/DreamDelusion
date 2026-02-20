import { useState } from 'react';
import type { EmotionKey } from './types';
import { EMOTION_COLORS, EMOTION_LABELS, EMOTION_KEYS } from './utils/constellation';

interface CaptureViewProps {
  isListening: boolean;
  livePreview: string;
  elapsedSeconds: number;
  onStartCapture: () => void;
  onStopCapture: () => void;
  speechSupported: boolean;
  pendingThought?: { text: string; durationSeconds: number } | null;
  onConfirmSaveWithEmotion?: (emotion: EmotionKey) => void;
  onCancelSave?: () => void;
}

export default function CaptureView({
  isListening,
  livePreview,
  elapsedSeconds,
  onStartCapture,
  onStopCapture,
  speechSupported,
  pendingThought = null,
  onConfirmSaveWithEmotion,
  onCancelSave,
}: CaptureViewProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionKey | null>(null);

  const handleToggle = () => {
    if (isListening) {
      onStopCapture();
    } else {
      onStartCapture();
    }
  };

  const words = livePreview.trim().split(/\s+/).filter(word => word.length > 0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManifest = () => {
    const emotion = selectedEmotion ?? 'neutral';
    onConfirmSaveWithEmotion?.(emotion);
    setSelectedEmotion(null);
  };

  const handleCancel = () => {
    onCancelSave?.();
    setSelectedEmotion(null);
  };

  // Review step: set emotion when finishing a thought (color-coded; synthesizing later mixes colors)
  if (pendingThought && onConfirmSaveWithEmotion) {
    return (
      <div className="capture-view-simple capture-review">
        <h2 className="capture-review-title">How did it feel?</h2>
        <p className="capture-review-transcript">"{pendingThought.text}"</p>
        <div className="capture-review-emotions">
          {EMOTION_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`capture-emotion-chip ${selectedEmotion === key ? 'selected' : ''}`}
              style={{
                ['--emotion-color' as string]: EMOTION_COLORS[key],
                backgroundColor: selectedEmotion === key ? EMOTION_COLORS[key] : undefined,
                borderColor: EMOTION_COLORS[key],
                color: selectedEmotion === key ? '#0a0a0a' : undefined,
              }}
              onClick={() => setSelectedEmotion(key)}
            >
              <span className="capture-emotion-dot" style={{ backgroundColor: EMOTION_COLORS[key] }} />
              {EMOTION_LABELS[key]}
            </button>
          ))}
        </div>
        <div className="capture-review-actions">
          <button type="button" className="capture-review-btn cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="capture-review-btn manifest" onClick={handleManifest}>
            Manifest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="capture-view-simple">
      <button
        className={`mic-button-simple ${isListening ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={!speechSupported}
        aria-label={isListening ? 'Stop Recording' : 'Start Recording'}
      >
        {isListening ? (
          <div className="mic-button-pulse">
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {isListening && (
        <div className="recording-timer" style={{
          textAlign: 'center',
          marginTop: '16px',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
          fontWeight: '500'
        }}>
          {formatTime(elapsedSeconds)}
        </div>
      )}

      {isListening && (
        <div className="live-transcription">
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
    </div>
  );
}
