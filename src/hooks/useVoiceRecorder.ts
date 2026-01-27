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
    console.log('[Voice] stopRecording called, isRecording:', isRecording);
    if (!isRecording) return;
    
    // Capture transcript BEFORE cleanup
    const finalText = finalTranscriptRef.current.trim();
    console.log('[Voice] Final transcript before cleanup:', finalText);
    
    setIsRecording(false);
    setIsProcessing(true);
    cleanup();

    // Wait a moment for any pending final transcripts, then call onTranscriptFinal
    setTimeout(() => {
      // Re-check in case more came in
      const latestText = finalTranscriptRef.current.trim() || finalText;
      console.log('[Voice] Calling onTranscriptFinal with:', latestText);
      setIsProcessing(false);
      
      if (latestText) {
        onTranscriptFinal?.(latestText);
      } else {
        // No speech detected - notify via error callback
        const noSpeechError = new Error('No speech detected. Please try again and speak clearly.');
        setError(noSpeechError);
        onError?.(noSpeechError);
      }
    }, 500);
  }, [isRecording, cleanup, onTranscriptFinal, onError]);

  const startRecording = useCallback(async () => {
    console.log('[Voice] Starting recording...');
    
    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      setElapsedSeconds(0);
      setRemainingSeconds(maxDurationSeconds);

      // Request microphone permission
      console.log('[Voice] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      console.log('[Voice] Microphone access granted');
      streamRef.current = stream;

      // Connect to backend WebSocket proxy (keeps API key server-side)
      const wsUrl = getProxyWsUrl(language);
      console.log('[Voice] Connecting to WebSocket proxy:', wsUrl);
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('[Voice] WebSocket connected to proxy');
        
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
          console.log('[Voice] Audio chunk available, size:', event.data.size);
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
            console.log('[Voice] Sent audio chunk to proxy');
          }
        };

        mediaRecorder.start(250); // Send chunks every 250ms
        console.log('[Voice] MediaRecorder started, sending chunks every 250ms');
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
        console.log('[Voice] Raw message received:', event.data.substring(0, 200));
        try {
          const data = JSON.parse(event.data);
          console.log('[Voice] Parsed message type:', data.type, 'is_final:', data.is_final);
          
          if (data.channel?.alternatives?.[0]) {
            const alt = data.channel.alternatives[0];
            const text = alt.transcript || '';
            console.log('[Voice] Transcript text:', text, 'is_final:', data.is_final);
            
            if (data.is_final) {
              // Final transcript - append to accumulated
              if (text.trim()) {
                finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + text).trim();
                console.log('[Voice] Accumulated transcript:', finalTranscriptRef.current);
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
          console.error('[Voice] Error parsing message:', e, 'Raw:', event.data);
        }
      };

      ws.onerror = (event) => {
        console.error('[Voice] WebSocket error:', event);
        const err = new Error('Voice recognition connection failed');
        setError(err);
        onError?.(err);
        cleanup();
        setIsRecording(false);
      };

      ws.onclose = (event) => {
        console.log('[Voice] WebSocket closed:', event.code, event.reason);
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
