import { useEffect, useRef } from 'react';
import { appConfig } from '../lib/config';
import type { ChatMessage } from '../types/chat';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  activeSessionId: string | null;
  isPending: boolean;
  messages: ChatMessage[];
}

export function MessageList({ activeSessionId, isPending, messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastSeenAssistantAudioIdRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isPending]);

  const latestAssistantAudioMessage =
    [...messages]
      .reverse()
      .find((message) => message.role === 'assistant' && message.audioUrl && message.status !== 'pending') ?? null;

  useEffect(() => {
    lastSeenAssistantAudioIdRef.current = latestAssistantAudioMessage?.id ?? null;
  }, [activeSessionId]);

  let autoPlayMessageId: string | null = null;

  if (appConfig.autoPlayAssistantAudio && latestAssistantAudioMessage) {
    if (lastSeenAssistantAudioIdRef.current === null) {
      lastSeenAssistantAudioIdRef.current = latestAssistantAudioMessage.id;
    } else if (lastSeenAssistantAudioIdRef.current !== latestAssistantAudioMessage.id) {
      autoPlayMessageId = latestAssistantAudioMessage.id;
      lastSeenAssistantAudioIdRef.current = latestAssistantAudioMessage.id;
    }
  }

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <div className="empty-state">
          <span className="empty-state__badge">TechShop Assistant</span>
          <h3>Start a sales conversation</h3>
          <p>Ask about products, client needs, availability, or create an order-ready conversation with audio and text.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          shouldAutoPlay={message.id === autoPlayMessageId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
