import type { ChatMessage, ChatSession } from '../../types/chat';

interface PersistedChatState {
  version: 1;
  activeSessionId: string | null;
  messagesBySession: Record<string, ChatMessage[]>;
  sessions: ChatSession[];
}

const STORAGE_KEY = 'techshop-sales-chat:v1';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadChatState(): PersistedChatState {
  if (!isBrowser()) {
    return {
      version: 1,
      activeSessionId: null,
      messagesBySession: {},
      sessions: []
    };
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return {
        version: 1,
        activeSessionId: null,
        messagesBySession: {},
        sessions: []
      };
    }

    const parsed = JSON.parse(rawValue) as Partial<PersistedChatState>;

    return {
      version: 1,
      activeSessionId: typeof parsed.activeSessionId === 'string' ? parsed.activeSessionId : null,
      messagesBySession: parsed.messagesBySession ?? {},
      sessions: (parsed.sessions ?? []).map((session) => ({
        ...session,
        backendSessionId: typeof session.backendSessionId === 'string' ? session.backendSessionId : null,
        clientId: typeof session.clientId === 'number' ? session.clientId : null
      }))
    };
  } catch {
    return {
      version: 1,
      activeSessionId: null,
      messagesBySession: {},
      sessions: []
    };
  }
}

export function saveChatState(state: Omit<PersistedChatState, 'version'>) {
  if (!isBrowser()) {
    return;
  }

  const payload: PersistedChatState = {
    version: 1,
    ...state
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
