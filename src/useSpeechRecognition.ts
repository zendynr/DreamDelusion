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
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          // Accumulate final transcripts
          finalTranscript += transcript + ' ';
        } else {
          // For interim, use the latest one
          interimTranscript = transcript;
        }
      }
      
      // Send final results if any
      if (finalTranscript.trim()) {
        callbacksRef.current.onResult?.(finalTranscript.trim(), true);
      }
      
      // Send interim results (always, even if empty to clear)
      callbacksRef.current.onResult?.(interimTranscript || '', false);
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


