import { appConfig } from '../config';
import type {
  ApiErrorKind,
  ApiErrorPayload,
  AudioChatRequest,
  ChatMessage,
  ModelsApiResponse,
  SendMessageApiResponse,
  TextChatRequest,
  ValidationErrorItem
} from '../../types/chat';
import { resolveApiUrl } from '../utils';

type JsonRecord = Record<string, unknown>;

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  validation?: ValidationErrorItem[];

  constructor(message: string, options: { kind: ApiErrorKind; status?: number; validation?: ValidationErrorItem[] }) {
    super(message);
    this.name = 'ApiError';
    this.kind = options.kind;
    this.status = options.status;
    this.validation = options.validation;
  }
}

function normalizeMessage(input: JsonRecord, fallback: Partial<ChatMessage>): ChatMessage {
  return {
    id: String(input.id ?? fallback.id ?? crypto.randomUUID()),
    role: (input.role as ChatMessage['role']) ?? fallback.role ?? 'assistant',
    content: String(input.content ?? input.response ?? input.message ?? fallback.content ?? ''),
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

function coerceNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractSessionId(input: JsonRecord): string | null {
  const nestedSession = input.session as JsonRecord | undefined;
  const nestedConversation = input.conversation as JsonRecord | undefined;

  const value =
    input.session_id ??
    input.sessionId ??
    nestedSession?.id ??
    nestedSession?.session_id ??
    nestedConversation?.id ??
    nestedConversation?.session_id;

  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function extractClientId(input: JsonRecord): number | null {
  const nestedClient = input.client as JsonRecord | undefined;
  const nestedCliente = input.cliente as JsonRecord | undefined;

  return coerceNullableNumber(
    input.cliente_id ??
      input.client_id ??
      input.clienteId ??
      nestedClient?.id ??
      nestedClient?.client_id ??
      nestedCliente?.id ??
      nestedCliente?.cliente_id
  );
}

function parseValidationMessage(detail: ValidationErrorItem[]) {
  return detail
    .map((item) => `${item.loc.join('.')} ${item.msg}`.trim())
    .join(' | ');
}

function parseApiErrorMessage(body: ApiErrorPayload, status: number) {
  if (Array.isArray(body.detail)) {
    return parseValidationMessage(body.detail);
  }

  if (typeof body.detail === 'string' && body.detail.trim() !== '') {
    return body.detail;
  }

  if (typeof body.message === 'string' && body.message.trim() !== '') {
    return body.message;
  }

  if (status === 404) {
    return 'Requested resource was not found.';
  }

  return `Request failed with status ${status}`;
}

function parseChatResponse(input: JsonRecord, fallbackUserContent: string): SendMessageApiResponse {
  const transcription = typeof input.transcription === 'string' ? input.transcription : undefined;
  const userMessageSource = (input.user_message as JsonRecord | undefined) ?? {};
  const assistantMessageSource = (input.assistant_message as JsonRecord | undefined) ?? input;

  return {
    transcription,
    sessionId: extractSessionId(input),
    clientId: extractClientId(input),
    userMessage: normalizeMessage(userMessageSource, {
      id: crypto.randomUUID(),
      role: 'user',
      content: transcription || fallbackUserContent,
      createdAt: new Date().toISOString(),
      transcription: transcription || null,
      status: 'sent'
    }),
    assistantMessage: normalizeMessage(assistantMessageSource, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      audioUrl: (input.audio_url as string | null | undefined) ?? null,
      status: 'sent'
    })
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      headers: {
        Accept: 'application/json',
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init?.headers
      },
      ...init
    });
  } catch {
    throw new ApiError('Unable to reach the backend service. Check the API URL or network connection.', {
      kind: 'network'
    });
  }

  if (!response.ok) {
    let body: ApiErrorPayload = {};

    try {
      body = (await response.json()) as ApiErrorPayload;
    } catch {
      body = {};
    }

    if (response.status === 422 && Array.isArray(body.detail)) {
      throw new ApiError(parseValidationMessage(body.detail), {
        kind: 'validation',
        status: response.status,
        validation: body.detail
      });
    }

    throw new ApiError(parseApiErrorMessage(body, response.status), {
      kind: 'backend',
      status: response.status
    });
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

    return {
      defaultModel:
        !Array.isArray(data) && typeof data.default_model === 'string'
          ? data.default_model
          : models[0]?.id ?? null,
      models
    };
  },

  async sendText(payload: TextChatRequest): Promise<SendMessageApiResponse> {
    const data = await request<JsonRecord>('/api/chat/text', {
      method: 'POST',
      body: JSON.stringify({
        message: payload.message,
        model: payload.model,
        session_id: payload.sessionId,
        cliente_id: payload.clientId
      })
    });

    return parseChatResponse(data, payload.message);
  },

  async sendAudio(payload: AudioChatRequest): Promise<SendMessageApiResponse> {
    const formData = new FormData();
    formData.set('file', payload.file, payload.fileName);

    if (payload.model) {
      formData.set('model', payload.model);
    }

    if (payload.sessionId) {
      formData.set('session_id', payload.sessionId);
    }

    if (payload.clientId !== null) {
      formData.set('cliente_id', String(payload.clientId));
    }

    const data = await request<JsonRecord>('/api/chat/audio', {
      method: 'POST',
      body: formData
    });

    return parseChatResponse(data, '');
  }
};
