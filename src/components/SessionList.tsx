import type { ChatSession } from '../types/chat';
import { cn, formatSessionDate } from '../lib/utils';

interface SessionListProps {
  activeSessionId: string | null;
  isLoading: boolean;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
  sessions: ChatSession[];
}

export function SessionList(props: SessionListProps) {
  const { activeSessionId, isLoading, onCreateSession, onSelectSession, sessions } = props;

  return (
    <aside className="sidebar">
      <div className="sidebar__topbar">
        <div>
          <p className="eyebrow">Conversations</p>
          <h1>TechShop Inbox</h1>
        </div>
        <button className="ghost-button" onClick={onCreateSession} type="button">
          New chat
        </button>
      </div>

      <div className="sidebar__content">
        {isLoading ? <p className="sidebar__hint">Loading conversations...</p> : null}
        {!isLoading && sessions.length === 0 ? <p className="sidebar__hint">No chats yet. Start the first conversation.</p> : null}

        <ul className="session-list">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                className={cn('session-card', session.id === activeSessionId && 'session-card--active')}
                onClick={() => onSelectSession(session.id)}
                type="button"
              >
                <div className="session-card__row">
                  <span className="session-card__title">{session.title}</span>
                  <span className="session-card__meta">{formatSessionDate(session.lastMessageAt || session.createdAt)}</span>
                </div>
                <p className="session-card__preview">{session.lastMessagePreview || 'No messages yet'}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
