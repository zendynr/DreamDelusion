interface CaptureViewProps {
  isListening: boolean;
  livePreview: string;
  onStartCapture: () => void;
  onStopCapture: () => void;
  speechSupported: boolean;
}

export default function CaptureView({
  isListening,
  livePreview,
  onStartCapture,
  onStopCapture,
  speechSupported,
}: CaptureViewProps) {
  const handleToggle = () => {
    if (isListening) {
      onStopCapture();
    } else {
      onStartCapture();
    }
  };

  // Split live preview into words for word-by-word animation
  const words = livePreview.trim().split(/\s+/).filter(word => word.length > 0);

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

