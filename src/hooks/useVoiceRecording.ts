import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecordingOptions {
  onStart?: () => void;
  onStop?: (audioBlob: Blob, duration: number) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      
      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        throw new Error('Audio recording format not supported in this browser');
      }
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Calculate duration from start time
        const finalDuration = startTimeRef.current 
          ? Math.floor((Date.now() - startTimeRef.current) / 1000)
          : 0;
        options.onStop?.(audioBlob, finalDuration);
        
        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };
      
      mediaRecorder.onerror = (event) => {
        const error = (event as any).error || 'Unknown recording error';
        setError(error.message || String(error));
        options.onError?.(error.message || String(error));
        stopRecording();
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setDuration(elapsed);
        }
      }, 1000);
      
      options.onStart?.();
    } catch (err: any) {
      const errorMessage = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Microphone access denied. Please allow microphone access.'
        : err.message || 'Failed to start recording';
      setError(errorMessage);
      options.onError?.(errorMessage);
      setIsRecording(false);
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      startTimeRef.current = null;
    }
  }, [isRecording]);

  const isSupported = useCallback(() => {
    return typeof MediaRecorder !== 'undefined' && 
           navigator.mediaDevices && 
           navigator.mediaDevices.getUserMedia;
  }, []);

  return {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    isSupported: isSupported(),
  };
}
