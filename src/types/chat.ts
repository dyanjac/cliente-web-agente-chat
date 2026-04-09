export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'sent' | 'pending' | 'error';
export type ApiErrorKind = 'network' | 'validation' | 'backend' | 'unknown';

export interface ChatSession {
  id: string;
  title: string;
  backendSessionId: string | null;
  clientId: number | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  createdAt?: string | null;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  audioUrl?: string | null;
  transcription?: string | null;
  status?: MessageStatus;
}

export interface ModelOption {
  id: string;
  label: string;
}

export interface ModelsApiResponse {
  defaultModel: string | null;
  models: ModelOption[];
}

export interface ChatTransportContext {
  sessionId: string | null;
  clientId: number | null;
}

export interface TextChatRequest extends ChatTransportContext {
  message: string;
  model: string | null;
}

export interface AudioChatRequest extends ChatTransportContext {
  file: Blob;
  fileName: string;
  model: string | null;
}

export interface SendMessageApiResponse extends ChatTransportContext {
  transcription?: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface ValidationErrorItem {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

export interface ValidationErrorResponse {
  detail: ValidationErrorItem[];
}

export interface ApiErrorPayload {
  detail?: string | ValidationErrorItem[];
  message?: string;
}

export interface RecorderResult {
  blob: Blob;
  durationMs: number;
}
