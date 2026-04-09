# TechShop Sales Chat UI

Client-side React application for the TechShop sales assistant backend. It provides a WhatsApp-inspired desktop chat experience with session navigation, text messaging, hold-to-record audio capture, assistant audio playback, model selection, and resilient API integration.

## Stack

- React 19
- TypeScript
- Vite
- React Router

## Features

- Session sidebar with active chat state
- Chronological chat thread with timestamps
- User and assistant message bubbles
- Assistant audio playback inline in the conversation
- Text composer with loading and error handling
- Press-and-hold microphone recording with duration feedback
- Safe stop handling for pointer release, cancel, and leave
- API base URL configured with environment variables
- Local conversation/session persistence when the backend exposes only stateless chat endpoints

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file and adjust the backend URL if needed:

```bash
cp .env.example .env
```

3. Start the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Environment

`VITE_API_BASE_URL` points to the FastAPI backend root.

Examples:

- `http://localhost:7860`
- `https://api.techshop.example.com`

## API Notes

The current UI is wired to these backend endpoints:

- `GET /api/models`
- `POST /api/chat/text`
- `POST /api/chat/audio`
- `GET /api/audio/{audio_id}`
- `GET /health`

Because the current API does not expose session or history endpoints, the sidebar sessions and message history are persisted client-side with `localStorage`. If you later add backend session endpoints, the only files you need to adapt are [`src/lib/api/client.ts`](c:\PYTHON\agente-chat\src\lib\api\client.ts) and [`src/hooks/useChatApp.ts`](c:\PYTHON\agente-chat\src\hooks\useChatApp.ts).

## Structure

```text
src/
  app/
  components/
  hooks/
  lib/
  pages/
  styles/
  types/
```

## Audio Recording Notes

The microphone button uses the browser MediaRecorder API. It starts recording on press, stops on release, and avoids sending recordings shorter than the minimum duration threshold. A secure context may be required in some browsers for microphone access.
