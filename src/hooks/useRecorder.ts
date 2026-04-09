import { useEffect, useRef, useState } from 'react';
import type { RecorderResult } from '../types/chat';

interface UseRecorderOptions {
  mimeType?: string;
}

export function useRecorder(options?: UseRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const stopResolverRef = useRef<((value: RecorderResult | null) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    if (isRecording) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      setError(null);
      setDurationMs(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, options?.mimeType ? { mimeType: options.mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setDurationMs(Date.now() - startedAtRef.current);
      }, 200);

      recorder.start();
    } catch {
      setError('Microphone access was denied or is unavailable.');
    }
  }

  async function stop() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      return null;
    }

    return await new Promise<RecorderResult | null>((resolve) => {
      stopResolverRef.current = resolve;

      recorder.onstop = () => {
        const endedAt = Date.now();
        const duration = endedAt - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });

        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setDurationMs(duration);
        setIsRecording(false);
        mediaRecorderRef.current = null;
        chunksRef.current = [];

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        stopResolverRef.current?.({ blob, durationMs: duration });
        stopResolverRef.current = null;
      };

      recorder.stop();
    });
  }

  function cancel() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    recorder.onstop = () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRecording(false);
      setDurationMs(0);
      mediaRecorderRef.current = null;
      chunksRef.current = [];

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      stopResolverRef.current?.(null);
      stopResolverRef.current = null;
    };

    recorder.stop();
  }

  return {
    isRecording,
    durationMs,
    error,
    start,
    stop,
    cancel,
    clearError: () => setError(null)
  };
}
