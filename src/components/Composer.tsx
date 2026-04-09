import { FormEvent, useState } from 'react';
import { HoldToRecordButton } from './HoldToRecordButton';

interface ComposerProps {
  disabled?: boolean;
  error?: string | null;
  onSendAudio: (blob: Blob) => Promise<void>;
  onSendText: (text: string) => Promise<void>;
}

export function Composer(props: ComposerProps) {
  const { disabled, error, onSendAudio, onSendText } = props;
  const [draft, setDraft] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextValue = draft.trim();
    if (!nextValue || disabled) {
      return;
    }

    setValidationMessage(null);
    setDraft('');
    await onSendText(nextValue);
  }

  return (
    <div className="composer-shell">
      <form className="composer" onSubmit={handleSubmit}>
        <label className="composer__input">
          <span className="sr-only">Type your message</span>
          <textarea
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about laptops, stock, clients, or orders..."
            rows={1}
            value={draft}
          />
        </label>

        <div className="composer__actions">
          <HoldToRecordButton disabled={disabled} onRecorded={onSendAudio} onValidationMessage={setValidationMessage} />
          <button className="send-button" disabled={disabled || draft.trim().length === 0} type="submit">
            Send
          </button>
        </div>
      </form>

      {validationMessage ? <p className="field-error">{validationMessage}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
