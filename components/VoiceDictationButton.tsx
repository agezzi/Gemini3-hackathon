import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { transcribeAudioBlob } from '../services/speechService';

export interface UseVoiceDictationOptions {
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onStateChange?: (isListening: boolean) => void;
}

export function useVoiceDictation({
  onFinalTranscript,
  onInterimTranscript,
  onStateChange,
}: UseVoiceDictationOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const finalBufferRef = useRef<string>('');
  const manualStopRef = useRef<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const onFinalRef = useRef(onFinalTranscript);
  const onInterimRef = useRef(onInterimTranscript);
  const onStateRef = useRef(onStateChange);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
    onInterimRef.current = onInterimTranscript;
    onStateRef.current = onStateChange;
  }, [onFinalTranscript, onInterimTranscript, onStateChange]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedSeconds(0);
  }, []);

  const releaseStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
      releaseStream();
    };
  }, [releaseStream, stopTimer]);

  const startMediaRecorderFallback = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice input is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mimeType = preferredTypes.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          audioChunksRef.current.push(evt.data);
        }
      };

      recorder.onstop = async () => {
        stopTimer();
        setIsListening(false);
        onStateRef.current?.(false);
        releaseStream();

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (chunks.length === 0) return;

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 400) return;

        setIsTranscribing(true);
        try {
          const text = await transcribeAudioBlob(blob);
          if (text) {
            onFinalRef.current(text);
          } else {
            setError('No clear speech detected. Please try again.');
          }
        } catch (err: any) {
          setError(err?.message || 'Unable to transcribe audio.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      setError(null);
      setIsListening(true);
      onStateRef.current?.(true);
      setElapsedSeconds(0);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      releaseStream();
      setIsListening(false);
      onStateRef.current?.(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError('Microphone permission is blocked. Allow microphone access in your browser.');
      } else {
        setError('Could not access microphone. Check your audio input device.');
      }
    }
  }, [releaseStream, stopTimer]);

  const start = useCallback(async () => {
    if (isListening || isTranscribing) return;
    setError(null);
    setInterimText('');
    onInterimRef.current?.('');
    finalBufferRef.current = '';
    manualStopRef.current = false;

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      await startMediaRecorderFallback();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        onStateRef.current?.(true);
        setElapsedSeconds(0);
        timerRef.current = window.setInterval(() => {
          setElapsedSeconds((s) => s + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let finalizedSinceLast = '';
        let liveInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const res = event.results[i];
          const transcript = res?.[0]?.transcript || '';
          if (res.isFinal) {
            finalizedSinceLast += transcript;
          } else {
            liveInterim += transcript;
          }
        }

        if (finalizedSinceLast.trim()) {
          finalBufferRef.current = `${finalBufferRef.current} ${finalizedSinceLast}`.trim();
        }

        const combinedPreview = `${finalBufferRef.current} ${liveInterim}`.trim();
        setInterimText(combinedPreview);
        onInterimRef.current?.(combinedPreview);
      };

      recognition.onerror = async (event: any) => {
        const errCode = event?.error;
        if (errCode === 'aborted' || manualStopRef.current) return;

        stopTimer();
        setIsListening(false);
        onStateRef.current?.(false);
        recognitionRef.current = null;

        if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
          setError('Microphone permission was denied. Enable mic access to dictate.');
          return;
        }
        if (errCode === 'network' || errCode === 'audio-capture') {
          // Seamless fallback to MediaRecorder + server transcription
          await startMediaRecorderFallback();
          return;
        }
        if (errCode === 'no-speech') {
          setError('No speech heard. Tap Speak and talk naturally.');
          return;
        }
        setError('Voice input paused. Please try again.');
      };

      recognition.onend = () => {
        stopTimer();
        setIsListening(false);
        onStateRef.current?.(false);
        recognitionRef.current = null;

        const finalText = finalBufferRef.current.trim();
        finalBufferRef.current = '';
        setInterimText('');
        onInterimRef.current?.('');

        if (finalText) {
          onFinalRef.current(finalText);
        }
      };

      recognition.start();
    } catch {
      await startMediaRecorderFallback();
    }
  }, [isListening, isTranscribing, startMediaRecorderFallback, stopTimer]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        setIsListening(false);
        onStateRef.current?.(false);
        stopTimer();
      }
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        setIsListening(false);
        onStateRef.current?.(false);
        stopTimer();
      }
    }
  }, [stopTimer]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return {
    isListening,
    isTranscribing,
    interimText,
    elapsedSeconds,
    error,
    clearError: () => setError(null),
    start,
    stop,
    toggle,
  };
}

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  onInterimChange?: (text: string) => void;
  idleLabel?: string;
  listeningLabel?: string;
  title?: string;
  compact?: boolean;
  variant?: 'default' | 'primary';
  disabled?: boolean;
}

export const VoiceDictationButton: React.FC<VoiceDictationButtonProps> = ({
  onTranscript,
  onInterimChange,
  idleLabel = 'Speak',
  listeningLabel = 'Stop',
  title = 'Dictate with your microphone',
  compact = false,
  variant = 'default',
  disabled = false,
}) => {
  const {
    isListening,
    isTranscribing,
    elapsedSeconds,
    error,
    clearError,
    toggle,
  } = useVoiceDictation({
    onFinalTranscript: onTranscript,
    onInterimTranscript: onInterimChange,
  });

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => {
          if (error) clearError();
          toggle();
        }}
        disabled={disabled || isTranscribing}
        title={title}
        aria-label={isListening ? 'Stop voice dictation' : title}
        className={`inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          compact ? 'px-2.5 py-1.5 text-xs min-h-[36px]' : 'px-3 py-2 text-xs min-h-[40px]'
        } ${
          isListening
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/25'
            : isTranscribing
              ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 cursor-wait'
              : variant === 'primary'
                ? 'bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/35'
                : 'bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-sky-900/15 dark:border-white/10'
        }`}
      >
        {isTranscribing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>Transcribing...</span>
          </>
        ) : isListening ? (
          <>
            <Square className="w-3 h-3 fill-current shrink-0" />
            <span>{listeningLabel}</span>
            <span className="tabular-nums opacity-90 text-[11px]">{formatDuration(elapsedSeconds)}</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{idleLabel}</span>
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          onClick={clearError}
          className="absolute right-0 top-full mt-2 z-50 w-64 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-500/40 text-xs font-medium text-rose-800 dark:text-rose-200 shadow-lg cursor-pointer"
        >
          {error}
        </div>
      )}
    </div>
  );
};
