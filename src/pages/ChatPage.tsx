import { ChatHeader } from '../components/ChatHeader';
import { Composer } from '../components/Composer';
import { MessageList } from '../components/MessageList';
import { SessionList } from '../components/SessionList';
import { useChatApp } from '../hooks/useChatApp';

export function ChatPage() {
  const chat = useChatApp();

  return (
    <main className="app-shell">
      <div className="chat-layout">
        <SessionList
          activeSessionId={chat.activeSessionId}
          isLoading={chat.isBootstrapping}
          onCreateSession={chat.createSession}
          onSelectSession={chat.setActiveSessionId}
          sessions={chat.sessions}
        />

        <section className="chat-panel">
          <ChatHeader
            activeSession={chat.activeSession}
            models={chat.models}
            onSelectModel={chat.setSelectedModel}
            selectedModel={chat.selectedModel}
          />

          {chat.sessionsError ? <div className="banner banner--error">{chat.sessionsError}</div> : null}

          <MessageList
            activeSessionId={chat.activeSessionId}
            isPending={chat.isSessionPending}
            messages={chat.activeMessages}
          />

          <Composer
            disabled={chat.isSessionPending}
            error={chat.composerError}
            onSendAudio={chat.sendAudioMessage}
            onSendText={chat.sendTextMessage}
          />
        </section>
      </div>
    </main>
  );
}
