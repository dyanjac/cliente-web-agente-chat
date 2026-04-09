import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/chat';
import { cn, formatMessageTime } from '../lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  shouldAutoPlay?: boolean;
}

export function MessageBubble({ message, shouldAutoPlay = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isPending = message.status === 'pending';
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!shouldAutoPlay || !audioRef.current) {
      return;
    }

    void audioRef.current.play().catch(() => {
      return;
    });
  }, [shouldAutoPlay, message.id]);

  return (
    <article className={cn('message-row', isUser && 'message-row--user')}>
      <div
        className={cn(
          'message-bubble',
          isUser ? 'message-bubble--user' : 'message-bubble--assistant',
          isPending && 'message-bubble--pending'
        )}
      >
        {!isUser ? <span className="message-bubble__sender">TechShop</span> : null}
        <p>{message.content}</p>
        {message.audioUrl ? (
          <audio className="message-bubble__audio" controls preload="none" ref={audioRef} src={message.audioUrl} />
        ) : null}
        <div className="message-bubble__meta">
          <span>{formatMessageTime(message.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
