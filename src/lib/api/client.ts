import { appConfig } from '../config';
import type {
  ChatMessage,
  ModelsApiResponse,
  ModelOption,
  SendAudioPayload,
  SendMessageApiResponse,
  SendTextPayload
} from '../../types/chat';
import { resolveApiUrl } from '../utils';

type JsonRecord = Record<string, unknown>;

function normalizeMessage(input: JsonRecord, fallback: Partial<ChatMessage>): ChatMessage {
  return {
    id: String(input.id ?? fallback.id ?? crypto.randomUUID()),
    role: (input.role as ChatMessage['role']) ?? fallback.role ?? 'assistant',
    content: String(input.content ?? fallback.content ?? ''),
    createdAt: String(input.created_at ?? input.createdAt ?? fallback.createdAt ?? new Date().toISOString()),
    audioUrl: resolveApiUrl(
      appConfig.apiBaseUrl,
      (input.audio_url as string | null | undefined) ??
        (input.audioUrl as string | null | undefined) ??
        fallback.audioUrl
    ),
    transcription: (input.transcription as string | null | undefined) ?? fallback.transcription ?? null,
    status: fallback.status ?? 'sent'
  };
}

function parseAssistantContent(input: JsonRecord) {
  if (typeof input.response === 'string') {
    return input.response;
  }

  if (typeof input.message === 'string') {
    return input.message;
  }

  if (typeof input.content === 'string') {
    return input.content;
  }

  return '';
}

function parseChatResponse(input: JsonRecord, fallbackUserContent: string): SendMessageApiResponse {
  const transcription = typeof input.transcription === 'string' ? input.transcription : undefined;
  const userMessageSource = (input.user_message as JsonRecord | undefined) ?? {};
  const assistantMessageSource = (input.assistant_message as JsonRecord | undefined) ?? input;

  const userMessage = normalizeMessage(userMessageSource, {
    id: crypto.randomUUID(),
    role: 'user',
    content: transcription || fallbackUserContent,
    createdAt: new Date().toISOString(),
    transcription: transcription || null,
    status: 'sent'
  });

  const assistantMessage = normalizeMessage(assistantMessageSource, {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: parseAssistantContent(assistantMessageSource),
    createdAt: new Date().toISOString(),
    audioUrl: (input.audio_url as string | null | undefined) ?? null,
    status: 'sent'
  });

  return {
    transcription,
    userMessage,
    assistantMessage
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as { detail?: string; message?: string };
      throw new Error(body.detail || body.message || fallback);
    } catch (error) {
      if (error instanceof Error && error.message !== 'Unexpected end of JSON input') {
        throw error;
      }

      throw new Error(fallback);
    }
  }

  return (await response.json()) as T;
}

export const apiClient = {
  async getHealth() {
    return await request<Record<string, string>>('/health');
  },

  async getModels(): Promise<ModelsApiResponse> {
    const data = await request<JsonRecord | string[]>('/api/models');
    const rawModels = Array.isArray(data)
      ? data
      : Array.isArray(data.models)
        ? data.models
        : Array.isArray(data.available_models)
          ? data.available_models
          : [];

    const models = rawModels.map((model) => {
      if (typeof model === 'string') {
        return { id: model, label: model };
      }

      const typedModel = model as JsonRecord;
      const value = String(typedModel.id ?? typedModel.name ?? typedModel.label ?? 'default');
      return {
        id: value,
        label: String(typedModel.label ?? typedModel.name ?? value)
      };
    });

    const defaultModel =
      !Array.isArray(data) && typeof data.default_model === 'string'
        ? data.default_model
        : models[0]?.id ?? null;

    return {
      defaultModel,
      models
    };
  },

  async sendText(payload: SendTextPayload): Promise<SendMessageApiResponse> {
    const data = await request<JsonRecord>('/api/chat/text', {
      method: 'POST',
      body: JSON.stringify({
        message: payload.message,
        model: payload.model || null
      })
    });

    return parseChatResponse(data, payload.message);
  },

  async sendAudio(payload: SendAudioPayload): Promise<SendMessageApiResponse> {
    const formData = new FormData();
    formData.set('file', payload.file, payload.fileName);

    if (payload.model) {
      formData.set('model', payload.model);
    }

    const data = await request<JsonRecord>('/api/chat/audio', {
      method: 'POST',
      body: formData
    });

    return parseChatResponse(data, '');
  }
};
