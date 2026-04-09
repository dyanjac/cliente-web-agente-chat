import { startTransition, useEffect, useMemo, useState } from 'react';
import { ApiError, apiClient } from '../lib/api/client';
import { appConfig } from '../lib/config';
import { generateId } from '../lib/id';
import { loadChatState, saveChatState } from '../lib/storage/chatStore';
import type { ChatMessage, ChatSession, ModelOption } from '../types/chat';

type MessagesBySession = Record<string, ChatMessage[]>;
type PendingBySession = Record<string, boolean>;

const pendingAssistantMessage = (sessionId: string): ChatMessage => ({
  id: `${sessionId}-assistant-pending`,
  role: 'assistant',
  content: 'TechShop is preparing a response...',
  createdAt: new Date().toISOString(),
  status: 'pending'
});

function createLocalSession(seed?: string): ChatSession {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: seed?.trim().slice(0, 32) || 'New customer chat',
    backendSessionId: null,
    clientId: null,
    lastMessagePreview: null,
    lastMessageAt: now,
    createdAt: now
  };
}

function sortSessions(sessions: ChatSession[]) {
  return [...sessions].sort((left, right) => {
    const leftDate = left.lastMessageAt || left.createdAt || '';
    const rightDate = right.lastMessageAt || right.createdAt || '';
    return rightDate.localeCompare(leftDate);
  });
}

export function useChatApp() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messagesBySession, setMessagesBySession] = useState<MessagesBySession>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [pendingBySession, setPendingBySession] = useState<PendingBySession>({});
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  useEffect(() => {
    const persistedState = loadChatState();
    setSessions(sortSessions(persistedState.sessions));
    setMessagesBySession(persistedState.messagesBySession);
    setActiveSessionId(persistedState.activeSessionId);

    let isMounted = true;

    async function bootstrap() {
      try {
        const modelsResponse = await apiClient.getModels().catch(() => ({
          defaultModel: null,
          models: []
        }));

        if (!isMounted) {
          return;
        }

        setModels(modelsResponse.models);
        setSelectedModel(modelsResponse.defaultModel || modelsResponse.models[0]?.id || '');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSessionsError(error instanceof Error ? error.message : 'Failed to load assistant configuration.');
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    saveChatState({
      activeSessionId,
      messagesBySession,
      sessions
    });
  }, [activeSessionId, messagesBySession, sessions]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions]
  );

  const activeMessages = useMemo(() => {
    if (!activeSessionId) {
      return [];
    }

    return messagesBySession[activeSessionId] ?? [];
  }, [activeSessionId, messagesBySession]);

  function getSessionByLocalId(localSessionId: string) {
    return sessions.find((session) => session.id === localSessionId) ?? null;
  }

  function applyConversationContext(localSessionId: string, nextContext: { sessionId: string | null; clientId: number | null }) {
    setSessions((current) =>
      current.map((session) =>
        session.id === localSessionId
          ? {
              ...session,
              backendSessionId: nextContext.sessionId ?? session.backendSessionId,
              clientId: nextContext.clientId ?? session.clientId
            }
          : session
      )
    );
  }

  function formatApiError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.kind === 'validation') {
        return `Validation error: ${error.message}`;
      }

      if (error.kind === 'network') {
        return error.message;
      }

      if (error.status === 404) {
        return 'The selected model or endpoint was not found on the backend.';
      }

      return error.message;
    }

    return error instanceof Error ? error.message : 'Unexpected error while communicating with the backend.';
  }

  function updateSessionPreview(sessionId: string, latestMessage: ChatMessage) {
    setSessions((current) =>
      sortSessions(
        current.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                title:
                  session.lastMessagePreview || session.title !== 'New customer chat'
                    ? session.title
                    : latestMessage.role === 'user'
                      ? latestMessage.content.slice(0, 32)
                      : session.title,
                lastMessagePreview: latestMessage.content,
                lastMessageAt: latestMessage.createdAt
              }
            : session
        )
      )
    );
  }

  function syncSessionPreviewFromMessages(sessionId: string, messages: ChatMessage[]) {
    const latestMessage = [...messages]
      .reverse()
      .find((message) => message.status !== 'pending');

    setSessions((current) =>
      sortSessions(
        current.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                lastMessagePreview: latestMessage?.content ?? null,
                lastMessageAt: latestMessage?.createdAt ?? session.createdAt ?? null
              }
            : session
        )
      )
    );
  }

  function createSession() {
    setSessionsError(null);

    const createdSession = createLocalSession();

    setSessions((current) => sortSessions([createdSession, ...current]));
    setMessagesBySession((current) => ({
      ...current,
      [createdSession.id]: []
    }));

    startTransition(() => {
      setActiveSessionId(createdSession.id);
    });
  }

  function ensureSessionId(seed?: string) {
    if (activeSessionId) {
      return activeSessionId;
    }

    const createdSession = createLocalSession(seed);
    setSessions((current) => sortSessions([createdSession, ...current]));
    setMessagesBySession((current) => ({
      ...current,
      [createdSession.id]: []
    }));
    setActiveSessionId(createdSession.id);

    return createdSession.id;
  }

  function setPending(sessionId: string, value: boolean) {
    setPendingBySession((current) => ({
      ...current,
      [sessionId]: value
    }));
  }

  function appendPendingAssistant(sessionId: string) {
    setMessagesBySession((current) => ({
      ...current,
      [sessionId]: [...(current[sessionId] ?? []), pendingAssistantMessage(sessionId)]
    }));
  }

  function removePendingAssistant(sessionId: string) {
    setMessagesBySession((current) => ({
      ...current,
      [sessionId]: (current[sessionId] ?? []).filter((message) => message.status !== 'pending')
    }));
  }

  async function sendTextMessage(content: string) {
    const trimmed = content.trim();

    if (!trimmed) {
      return;
    }

    const sessionId = ensureSessionId(trimmed);
    const activeConversation = getSessionByLocalId(sessionId);
    setComposerError(null);
    setPending(sessionId, true);

    const optimisticUserMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
      status: 'sent'
    };

    setMessagesBySession((current) => ({
      ...current,
      [sessionId]: [...(current[sessionId] ?? []), optimisticUserMessage]
    }));
    updateSessionPreview(sessionId, optimisticUserMessage);
    appendPendingAssistant(sessionId);

    try {
      const response = await apiClient.sendText({
        message: trimmed,
        model: selectedModel || null,
        sessionId: activeConversation?.backendSessionId ?? null,
        clientId: activeConversation?.clientId ?? null
      });

      applyConversationContext(sessionId, {
        sessionId: response.sessionId,
        clientId: response.clientId
      });

      setMessagesBySession((current) => ({
        ...current,
        [sessionId]: [
          ...(current[sessionId] ?? []).filter(
            (message) => message.id !== optimisticUserMessage.id && message.status !== 'pending'
          ),
          response.userMessage,
          response.assistantMessage
        ]
      }));
      updateSessionPreview(sessionId, response.assistantMessage);
    } catch (error) {
      setMessagesBySession((current) => {
        const nextMessages = (current[sessionId] ?? []).filter(
          (message) => message.id !== optimisticUserMessage.id && message.status !== 'pending'
        );

        syncSessionPreviewFromMessages(sessionId, nextMessages);

        return {
          ...current,
          [sessionId]: nextMessages
        };
      });
      setComposerError(formatApiError(error));
    } finally {
      setPending(sessionId, false);
    }
  }

  async function sendAudioMessage(file: Blob) {
    const sessionId = ensureSessionId();
    const activeConversation = getSessionByLocalId(sessionId);
    setComposerError(null);
    setPending(sessionId, true);
    appendPendingAssistant(sessionId);

    try {
      const response = await apiClient.sendAudio({
        file,
        fileName: `recording-${Date.now()}.webm`,
        model: selectedModel || null,
        sessionId: activeConversation?.backendSessionId ?? null,
        clientId: activeConversation?.clientId ?? null
      });

      applyConversationContext(sessionId, {
        sessionId: response.sessionId,
        clientId: response.clientId
      });

      setMessagesBySession((current) => ({
        ...current,
        [sessionId]: [
          ...(current[sessionId] ?? []).filter((message) => message.status !== 'pending'),
          response.userMessage,
          response.assistantMessage
        ]
      }));
      updateSessionPreview(sessionId, response.assistantMessage);
    } catch (error) {
      removePendingAssistant(sessionId);
      setComposerError(formatApiError(error));
    } finally {
      setPending(sessionId, false);
    }
  }

  return {
    activeMessages,
    activeSession,
    activeSessionId,
    appName: appConfig.appName,
    composerError,
    createSession,
    isBootstrapping,
    isSessionPending: activeSessionId ? Boolean(pendingBySession[activeSessionId]) : false,
    models,
    selectedModel,
    sendAudioMessage,
    sendTextMessage,
    sessions,
    sessionsError,
    setActiveSessionId,
    setComposerError,
    setSelectedModel
  };
}
