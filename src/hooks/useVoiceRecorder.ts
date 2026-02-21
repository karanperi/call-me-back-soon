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
  const waitingForFinalRef = useRef(false);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const progress = elapsedSeconds / maxDurationSeconds;

  // Closes WebSocket and clears all resources
  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) { /* already stopped */ }
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.close();
      }
      websocketRef.current = null;
    }

    waitingForFinalRef.current = false;
  }, []);

  // Finalize: deliver transcript and clean up
  const finalize = useCallback(() => {
    const text = finalTranscriptRef.current.trim();
    console.log('[Voice] finalize called with:', text);

    cleanup();
    setIsRecording(false);
    setIsProcessing(false);

    if (text) {
      onTranscriptFinal?.(text);
    } else {
      const noSpeechError = new Error('No speech detected. Please try again and speak clearly.');
      setError(noSpeechError);
      onError?.(noSpeechError);
    }
  }, [cleanup, onTranscriptFinal, onError]);

  const stopRecording = useCallback(() => {
    console.log('[Voice] stopRecording called');
    if (!isRecording && !waitingForFinalRef.current) return;

    setIsRecording(false);
    setIsProcessing(true);
    waitingForFinalRef.current = true;

    // Stop sending audio
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) { /* ok */ }
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // If we already have a transcript, finalize immediately
    if (finalTranscriptRef.current.trim()) {
      console.log('[Voice] Already have transcript, finalizing immediately');
      finalize();
      return;
    }

    // Otherwise keep WebSocket open for up to 3s to receive pending transcripts
    console.log('[Voice] Waiting up to 3s for final transcript...');
    safetyTimeoutRef.current = setTimeout(() => {
      console.log('[Voice] Safety timeout reached');
      finalize();
    }, 3000);
  }, [isRecording, finalize]);

  const startRecording = useCallback(async () => {
    console.log('[Voice] Starting recording...');

    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      waitingForFinalRef.current = false;
      setElapsedSeconds(0);
      setRemainingSeconds(maxDurationSeconds);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      const wsUrl = getProxyWsUrl(language);
      console.log('[Voice] Connecting to WebSocket proxy:', wsUrl);
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('[Voice] WebSocket connected to proxy');

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

        mediaRecorder.start(250);
        setIsRecording(true);

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
            const text = data.channel.alternatives[0].transcript || '';

            if (data.is_final) {
              if (text.trim()) {
                finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + text).trim();
                setTranscript(finalTranscriptRef.current);
                setInterimTranscript('');
                onTranscriptUpdate?.(finalTranscriptRef.current);

                // If we're in graceful shutdown, finalize now
                if (waitingForFinalRef.current) {
                  console.log('[Voice] Got final transcript during shutdown, finalizing');
                  if (safetyTimeoutRef.current) {
                    clearTimeout(safetyTimeoutRef.current);
                    safetyTimeoutRef.current = null;
                  }
                  finalize();
                }
              }
            } else {
              setInterimTranscript(text);
            }
          }
        } catch (e) {
          console.error('[Voice] Error parsing message:', e);
        }
      };

      ws.onerror = () => {
        const err = new Error('Voice recognition connection failed');
        setError(err);
        onError?.(err);
        cleanup();
        setIsRecording(false);
      };

      ws.onclose = (event) => {
        console.log('[Voice] WebSocket closed:', event.code, event.reason);
        // If we're waiting for a final and the socket closed, finalize with what we have
        if (waitingForFinalRef.current) {
          finalize();
        }
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
  }, [maxDurationSeconds, language, onTranscriptUpdate, onTimeUp, onError, cleanup, stopRecording, finalize]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  useEffect(() => {
    return () => { cleanup(); };
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
