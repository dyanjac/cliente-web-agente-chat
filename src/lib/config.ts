const fallbackApiBaseUrl = 'http://localhost:7860';
const fallbackAutoPlayAssistantAudio = false;

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export const appConfig = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || fallbackApiBaseUrl,
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) || 'TechShop Sales Assistant',
  minimumRecordingMs: 800,
  autoPlayAssistantAudio: parseBooleanEnv(
    import.meta.env.VITE_AUTO_PLAY_ASSISTANT_AUDIO as string | undefined,
    fallbackAutoPlayAssistantAudio
  )
};
