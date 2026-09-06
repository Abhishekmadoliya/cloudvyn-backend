# AI Interview Flow Architecture

This document outlines the end-to-end flow of the AI Interview feature, tracking the lifecycle from the candidate joining the interview page to the generation of final feedback.

## 1. Initialization & Permissions (Frontend)
- **URL parsing**: The candidate lands on `interview/[category]/page.jsx`. The frontend extracts `context` (containing interview guidelines, total duration, type, etc.) from the URL parameters.
- **Media Access**: It requests microphone access (and camera access if the `interviewType` is "technical") using `navigator.mediaDevices.getUserMedia()`.
- **Audio Setup**: A `MediaSource` and `SourceBuffer` are initialized to play the incoming audio streams continuously. A timer is started based on the initial duration provided in the context.

## 2. WebSocket Connection Setup (Frontend -> Backend)
- **Connecting**: The frontend establishes a WebSocket connection to the backend (`process.env.NEXT_PUBLIC_WS_URL`).
- **`init_context`**: Upon successful connection, the frontend sends an `init_context` JSON message.
  - Payload includes the parsed URL context, Firebase authentication token, user ID, and a uniquely tracked `sessionId` (persisted in `sessionStorage` to handle accidental page refreshes gracefully).

## 3. Context Validation, Rate Limiting & First Question (Backend)
- **Authentication**: The backend verifies the Firebase token to ensure a valid user session.
- **Session & Rate Limiting (Anti-Abuse)**: 
  - The backend uses `handleUserSession()` to enforce rate limits (e.g., maximum of 2 allowed interview attempts per user).
  - It binds the WebSocket connection to the specific `sessionId` and checks if the session has already been completed. If a reused link or completed session is detected, it rejects the connection (Error 4003) and the frontend prevents the interview.
- **Interview Instantiation**: It gets or creates a database record for the interview context (`getOrCreateInterview()`), with support for resuming a dropped session if history exists.
- **First Question Generation**:
  - A fallback-enabled LLM call (`generateWithFallback`) is used to generate the first professional interview question under 100 words without abbreviations or markdown.
  - The question is appended to the session `history`.
- **First Question Sent**:
  - The text is sent to the frontend via a `first_question` JSON message.
  - The backend generates TTS (Text-to-Speech) audio for the question and streams binary audio chunks back to the frontend (`streamAudioToClient()`).

## 4. Audio Playback (Frontend)
- The frontend registers the `first_question` and updates the UI chat logs.
- Incoming binary blobs from the backend are appended into a client-side Audio Queue and streamed natively through the `MediaSource` element.
- If backend TTS fails, a `tts_fallback` signal can trigger native `window.speechSynthesis` (Web Speech API).

## 5. Candidate Answering (Frontend -> Backend)
- **Recording**: The candidate clicks "Record/Unmute" to speak. The frontend uses a `MediaRecorder` configured to record `audio/webm;codecs=opus` chunks.
- **Submission**: When the candidate stops recording, the audio chunks are aggregated into a single `Blob`.
- **Binary Transfer**: This audio `Blob` is sent instantly as a raw binary WebSocket message to the backend.

## 6. Live Speech Processing & AI Conversation Loop (Backend <-> Frontend)
When the backend receives a binary audio chunk:
- **Message Limit Check**: The backend verifies that the session hasn't exceeded the maximum allowed messages (`MAX_MESSAGES_PER_SESSION = 50`) to prevent abuse and manage LLM context windows. If exceeded, it sends a `SESSION_LIMIT_EXCEEDED` error.
- **Speech-to-Text (STT)**:
  - The binary data is saved locally as a temporary webm file.
  - It utilizes Groq API's `whisper-large-v3` model to transcribe the candidate's audio into text.
  - *Fallback mechanism*: If Whisper fails, it switches to Google STT (`transcribeWithGoogle()`).
- **Prompting the LLM**:
  - The newly transcribed candidate response is added to the in-memory array `history`.
  - The LLM is prompted keeping the entire historical context (`history`) and interview format in mind.
- **Responding via TTS**:
  - The AI formulates the next conversational response.
  - The generated text is passed back directly via an `ai_response` JSON message.
  - Audio TTS logic encodes the generated response and streams the chunks down the WebSocket again.
- Cleanup: Temporary audio file unlinked from the server.

## 7. Periodic Syncing 
- Every 30 seconds, the frontend sends a `time_update` socket message syncing up `timeLeft` and `totalDuration`. The backend utilizes this to preserve the remaining time if the candidate crashes and resumes, or forces the session closed.

## 8. Closing the Session & Feedback Generation (Frontend/Backend Integration)
The interview is marked to conclude either because:
  - The context timer runs out.
  - The candidate clicks the "End Interview" button.
  - Standard exit conditions (`beforeunload` during navigation).
  
1. **Triggering End**: 
   - Frontend sends an `end_interview` JSON socket message.
2. **Review AI Prompt**: 
   - The backend structures a comprehensive final prompt leveraging the entirety of the `history` and `context` attributes.
   - It demands a JSON evaluation mapping `{score, feedback, areasForImprovement}`.
3. **Database Write**: 
   - Calling `finalizeInterview()`, it permanently locks in the user history, interview state to `"completed"`, duration, and LLM-evaluated feedback string to the Database.
4. **Displaying Results**: 
   - Final JSON `{type: "feedback", payload: ...}` is broadcast to the frontend.
   - The WebSocket is strictly closed (`ws.close(1000)`).
   - Frontend clears the session tokens to prevent restarting old references, stops all camera/mic tracks, and displays the feedback dashboard to the user.

_If the WebSocket unexpectedly disconnects early naturally, the `ws.on("close")` handler checks the database. If the interview was in progress ("started"), it auto-finalizes the progress by injecting a fallback/early-abandon evaluation process._
