import { useState, useRef, useCallback } from 'react';

interface UseScreenRecordingOptions {
  onStart?: () => void;
  onStop?: (videoBlob: Blob, duration: number) => void;
  onError?: (error: string) => void;
  includeAudio?: boolean; // Whether to include system audio (requires additional permissions)
}

export function useScreenRecording(options: UseScreenRecordingOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request screen capture
      const displayMediaOptions: DisplayMediaStreamConstraints = {
        video: {
          displaySurface: 'browser', // or 'window', 'monitor'
        } as MediaTrackConstraints,
        audio: options.includeAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      };
      
      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      streamRef.current = stream;
      
      // If audio was requested, also get microphone audio and combine
      let finalStream = stream;
      if (options.includeAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Combine video from screen and audio from microphone
          const audioTrack = audioStream.getAudioTracks()[0];
          finalStream = new MediaStream([
            ...stream.getVideoTracks(),
            audioTrack,
          ]);
          
          // Stop the original stream's audio if it exists
          stream.getAudioTracks().forEach(track => track.stop());
        } catch (audioError) {
          console.warn('Could not get microphone audio, continuing with screen only:', audioError);
        }
      }
      
      // Handle user stopping the share from the browser UI
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.addEventListener('ended', () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      });
      
      // Check if MediaRecorder is supported
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';
      
      if (!mimeType) {
        throw new Error('Video recording format not supported in this browser');
      }
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });
      
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: mimeType });
        // Calculate duration from start time
        const finalDuration = startTimeRef.current 
          ? Math.floor((Date.now() - startTimeRef.current) / 1000)
          : 0;
        options.onStop?.(videoBlob, finalDuration);
        
        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());
        if (finalStream !== stream) {
          finalStream.getTracks().forEach(track => track.stop());
        }
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
        ? 'Screen sharing permission denied. Please allow screen sharing.'
        : err.message || 'Failed to start screen recording';
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
           navigator.mediaDevices.getDisplayMedia;
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
