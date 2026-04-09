const fallbackApiBaseUrl = 'http://localhost:7860';

export const appConfig = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || fallbackApiBaseUrl,
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) || 'TechShop Sales Assistant',
  minimumRecordingMs: 800
};
