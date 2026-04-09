export type MessageRole = 'user' | 'assistant';

export interface ChatSession {
  id: string;
  title: string;
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
  status?: 'sent' | 'pending' | 'error';
}

export interface ModelOption {
  id: string;
  label: string;
}

export interface ModelsApiResponse {
  defaultModel: string | null;
  models: ModelOption[];
}

export interface SessionsApiResponse {
  sessions: ChatSession[];
}

export interface MessagesApiResponse {
  messages: ChatMessage[];
}

export interface SendTextPayload {
  message: string;
  model: string;
}

export interface SendAudioPayload {
  file: Blob;
  fileName: string;
  model: string;
}

export interface SendMessageApiResponse {
  transcription?: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface RecorderResult {
  blob: Blob;
  durationMs: number;
}
