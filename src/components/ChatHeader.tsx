import type { ChatSession, ModelOption } from '../types/chat';

interface ChatHeaderProps {
  activeSession: ChatSession | null;
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export function ChatHeader(props: ChatHeaderProps) {
  const { activeSession, models, onSelectModel, selectedModel } = props;

  return (
    <header className="chat-header">
      <div className="chat-header__identity">
        <div className="chat-header__avatar">TS</div>
        <div>
          <h2>{activeSession?.title || 'TechShop Sales Assistant'}</h2>
          <p>Sales guidance, product discovery, and order support</p>
        </div>
      </div>

      <label className="select-field">
        <span>Model</span>
        <select onChange={(event) => onSelectModel(event.target.value)} value={selectedModel}>
          {models.length === 0 ? <option value="">Default backend model</option> : null}
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
