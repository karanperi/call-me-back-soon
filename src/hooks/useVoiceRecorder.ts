import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceRecorderOptions {
  maxDurationSeconds?: number;
  onTranscriptUpdate?: (transcript: string) => void;
  onTranscriptFinal?: (transcript: string) => void;
  onTimeUp?: () => void;
  onError?: (error: Error) => void;
  language?: string;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  remainingSeconds: number;
  elapsedSeconds: number;
  progress: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
  error: Error | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

function getProxyWsUrl(language: string) {
  // Prefer using configured backend URL; fallback to current origin (works in local dev)
  const base = (SUPABASE_URL || window.location.origin).replace(/^http/, "ws");
  return `${base}/functions/v1/deepgram-proxy?language=${encodeURIComponent(language)}`;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    maxDurationSeconds = 60,
    onTranscriptUpdate,
    onTranscriptFinal,
    onTimeUp,
    onError,
    language = 'en'
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(maxDurationSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');

  const progress = elapsedSeconds / maxDurationSeconds;

  const cleanup = useCallback(() => {
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log('MediaRecorder already stopped');
      }
    }
    mediaRecorderRef.current = null;

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close websocket
    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.close();
      }
      websocketRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    
    setIsRecording(false);
    setIsProcessing(true);
    cleanup();

    // Wait a moment for final transcripts to arrive, then call onTranscriptFinal
    setTimeout(() => {
      const finalText = finalTranscriptRef.current.trim();
      setIsProcessing(false);
      onTranscriptFinal?.(finalText);
    }, 500);
  }, [isRecording, cleanup, onTranscriptFinal]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      setElapsedSeconds(0);
      setRemainingSeconds(maxDurationSeconds);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      // Connect to backend WebSocket proxy (keeps API key server-side)
      const ws = new WebSocket(getProxyWsUrl(language));
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('Deepgram WebSocket connected');
        
        // Set up MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 16000
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(250); // Send chunks every 250ms
        setIsRecording(true);

        // Start countdown timer
        timerIntervalRef.current = setInterval(() => {
          setElapsedSeconds(prev => {
            const newElapsed = prev + 1;
            setRemainingSeconds(maxDurationSeconds - newElapsed);

            if (newElapsed >= maxDurationSeconds) {
              stopRecording();
              onTimeUp?.();
            }

            return newElapsed;
          });
        }, 1000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.channel?.alternatives?.[0]) {
            const alt = data.channel.alternatives[0];
            const text = alt.transcript || '';
            
            if (data.is_final) {
              // Final transcript - append to accumulated
              if (text.trim()) {
                finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + text).trim();
                setTranscript(finalTranscriptRef.current);
                setInterimTranscript('');
                onTranscriptUpdate?.(finalTranscriptRef.current);
              }
            } else {
              // Interim transcript
              setInterimTranscript(text);
            }
          }
        } catch (e) {
          console.error('Error parsing Deepgram message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('Deepgram WebSocket error:', event);
        const err = new Error('Voice recognition connection failed');
        setError(err);
        onError?.(err);
        cleanup();
        setIsRecording(false);
      };

      ws.onclose = (event) => {
        console.log('Deepgram WebSocket closed:', event.code, event.reason);
      };

    } catch (err) {
      console.error('Error starting recording:', err);
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      
      if (error.name === 'NotAllowedError') {
        error.message = 'Microphone permission denied. Please allow microphone access.';
      }
      
      setError(error);
      onError?.(error);
      cleanup();
    }
  }, [maxDurationSeconds, language, onTranscriptUpdate, onTimeUp, onError, cleanup, stopRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    isProcessing,
    transcript,
    interimTranscript,
    remainingSeconds,
    elapsedSeconds,
    progress,
    startRecording,
    stopRecording,
    clearTranscript,
    error
  };
}
