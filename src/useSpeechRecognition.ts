import { useEffect, useRef } from 'react';

type SpeechRecognitionCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
};

export function useSpeechRecognition(callbacks: SpeechRecognitionCallbacks) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const callbacksRef = useRef(callbacks);

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    // Improve accuracy settings
    recognition.maxAlternatives = 1; // Use best alternative only
    // Note: grammars and serviceURI are not widely supported, so we focus on what works

    recognition.onstart = () => {
      callbacksRef.current.onStart?.();
    };

    recognition.onend = () => {
      callbacksRef.current.onEnd?.();
    };

    recognition.onerror = (event: any) => {
      const error = event.error || 'Unknown error';
      callbacksRef.current.onError?.(error);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      // Process all results from resultIndex to the end
      // This ensures we capture all final results that may have been missed
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        
        // Get the transcript - use the first alternative (most confident)
        const transcript = result[0]?.transcript || '';
        
        if (result.isFinal && transcript.trim()) {
          // Accumulate final transcripts with proper spacing
          finalTranscript += (finalTranscript ? ' ' : '') + transcript.trim();
        } else if (!result.isFinal) {
          // For interim, build from all interim results for better accuracy
          // This helps when speech recognition processes words in chunks
          if (interimTranscript) {
            interimTranscript += ' ' + transcript.trim();
          } else {
            interimTranscript = transcript.trim();
          }
        }
      }
      
      // Send final results if any (these are confirmed accurate)
      if (finalTranscript.trim()) {
        callbacksRef.current.onResult?.(finalTranscript.trim(), true);
      }
      
      // Send interim results (always, even if empty to clear)
      // Clean up the interim transcript to avoid duplicate words
      const cleanedInterim = interimTranscript.trim().replace(/\s+/g, ' ');
      callbacksRef.current.onResult?.(cleanedInterim || '', false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
  }, []);

  const start = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    }
  };

  const stop = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
  };

  const isSupported = () => {
    return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
  };

  return { start, stop, isSupported };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}


