# AI Interview Tech Stack

This document outlines the technical ecosystem used by the AI Interview platform, specifically focusing on the real-time interaction layer (`wshandler.js`).

## Backend Core
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Communication**: [WebSockets (ws)](https://github.com/websockets/ws) for real-time bi-directional chat, audio streaming, and code synchronization.
- **Framework**: [Express.js](https://expressjs.com/) (Main API structure).

## Artificial Intelligence

### Language Models (LLM)
- **Primary**: [Google Gemini 2.0 Flash-Lite](https://ai.google.dev/) (via `@google/generative-ai`).
- **Secondary/Fallback**: [Groq](https://groq.com/) (Llama-3.1-8b-instant) for low-latency inference.
- **Local**: [Ollama](https://ollama.com/) (Optional local backup).

### Speech-to-Text (STT)
- **Primary (Cloud)**: [Groq Whisper (large-v3)](https://groq.com/docs/speech-to-text) for low-latency, high-accuracy transcription.
- **Secondary (Local)**: [Faster-Whisper](https://github.com/SYSTRAN/faster-whisper) (Python FastAPI server on port 8001).
- **Fallback**: [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text) (REST API).


### Text-to-Speech (TTS)
- **Primary (Local)**: [Piper TTS](https://github.com/rhasspy/piper) (Using `en_US-lessac-high.onnx` model) for high-speed, high-quality local synthesis.
- **Secondary (Cloud)**: [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech) (Studio voices for high quality).
- **Client Fallback**: [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (In-browser synthesis when backend TTS is unavailable).

## Technical Interview Features
- **Code Execution**: [Piston API](https://github.com/engineer-man/piston) (Secure, sandboxed execution for JavaScript, Python, C++, etc.).
- **Code Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/) (Frontend integration via `@monaco-editor/react`).

## Data & Security
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) for interview session records and historical persistence.
- **Authentication**: [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) for secure candidate token verification.
- **Storage**: Temporary local filesystem (`fs`) for processing audio buffers before transcription.

## Orchestration
- **Session ID**: [UUID v4](https://github.com/uuidjs/uuid) for unique interview and file tracking.
- **Networking**: [Axios](https://axios-http.com/) and Native Fetch for inter-service communication.
