import type { ChatMessage } from '../types/chat';
import { cn, formatMessageTime } from '../lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isPending = message.status === 'pending';

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
          <audio className="message-bubble__audio" controls preload="none" src={message.audioUrl} />
        ) : null}
        <div className="message-bubble__meta">
          <span>{formatMessageTime(message.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
