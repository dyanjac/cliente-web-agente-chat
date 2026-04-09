import { useRef, useState } from 'react';
import { appConfig } from '../lib/config';
import { formatRecordingTime } from '../lib/utils';
import { useRecorder } from '../hooks/useRecorder';

interface HoldToRecordButtonProps {
  disabled?: boolean;
  onRecorded: (blob: Blob) => Promise<void>;
  onValidationMessage: (message: string | null) => void;
}

export function HoldToRecordButton(props: HoldToRecordButtonProps) {
  const { disabled, onRecorded, onValidationMessage } = props;
  const [isSending, setIsSending] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);
  const { cancel, clearError, durationMs, error, isRecording, start, stop } = useRecorder();

  async function finalizeRecording() {
    const result = await stop();

    if (!result) {
      return;
    }

    if (result.durationMs < appConfig.minimumRecordingMs) {
      onValidationMessage('Recording is too short. Hold a little longer before releasing.');
      return;
    }

    onValidationMessage(null);
    setIsSending(true);

    try {
      await onRecorded(result.blob);
    } finally {
      setIsSending(false);
    }
  }

  async function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || isSending) {
      return;
    }

    onValidationMessage(null);
    clearError();
    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    await start();
  }

  async function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    await finalizeRecording();
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLButtonElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    cancel();
    onValidationMessage('Recording cancelled.');
  }

  function handlePointerLeave(event: React.PointerEvent<HTMLButtonElement>) {
    if (!isRecording || activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    cancel();
    onValidationMessage('Recording cancelled.');
  }

  return (
    <div className="recorder">
      <button
        aria-label={isRecording ? 'Release to send voice note' : 'Hold to record voice note'}
        className={`record-button ${isRecording ? 'record-button--active' : ''}`}
        disabled={disabled || isSending}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        type="button"
      >
        <span className="record-button__icon">{isRecording ? '■' : 'Mic'}</span>
      </button>

      <div className="recorder__meta">
        <span className={isRecording ? 'status-pill status-pill--live' : 'status-pill'}>
          {isRecording ? `Recording ${formatRecordingTime(durationMs)}` : isSending ? 'Sending audio...' : 'Hold to talk'}
        </span>
        {error ? <span className="field-error">{error}</span> : null}
      </div>
    </div>
  );
}
