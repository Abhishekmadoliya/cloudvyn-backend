import {
  initGdRoom,
  registerWsClient,
  unregisterWsClient,
  processUtterance,
  processVoiceUtterance,
  handleSilenceNudge,
  finalizeGdSession,
} from "../services/gd/gdOrchestrator.js";

// Connection mapping ws -> { sessionId, userId }
const wsToGdSession = new Map();

/**
 * Check if WebSocket connection belongs to an active GD Session
 */
export function isGdWsClient(ws) {
  return wsToGdSession.has(ws);
}

/**
 * Main WebSocket Text Message Event Handler for Group Discussion (GD)
 */
export async function handleGdWsMessage(ws, message) {
  const { type, payload } = message;

  try {
    switch (type) {
      // 1. Initialize or Join GD Session Room
      case "init_gd_session":
      case "gd_init": {
        const { sessionId, userId, userName, userStance, topicId, customTopic, durationSeconds } = payload || {};

        if (!sessionId) {
          ws.send(JSON.stringify({ type: "gd_error", text: "sessionId is required" }));
          return;
        }

        const room = await initGdRoom(sessionId, userId || "anonymous", {
          userName: userName || "Candidate",
          userStance: userStance || "neutral",
          topicId,
          customTopic,
          durationSeconds,
        });

        wsToGdSession.set(ws, { sessionId, userId });
        registerWsClient(sessionId, ws);

        ws.send(
          JSON.stringify({
            type: "gd_session_ready",
            payload: {
              sessionId: room.sessionId,
              topic: room.topic,
              durationSeconds: room.durationSeconds,
              participants: room.participants.map((p) => ({
                id: p.agentInstanceId || p.userId || p.name,
                name: p.name,
                type: p.type,
                archetype: p.archetype,
                stance: p.stance,
              })),
              transcript: room.transcript,
            },
          })
        );
        console.log(`[GD WS] Client joined GD session room ${sessionId}`);
        break;
      }

      // 2. Start GD Discussion (AI Moderator/Dominant Agent opens topic)
      case "start_gd":
      case "gd_start": {
        const sessionInfo = wsToGdSession.get(ws);
        if (!sessionInfo) {
          ws.send(JSON.stringify({ type: "gd_error", text: "Not joined to a GD session" }));
          return;
        }

        // Trigger opening line by dominant agent / moderator
        await handleSilenceNudge(sessionInfo.sessionId);
        break;
      }

      // 3. Text Candidate Utterance
      case "human_utterance":
      case "gd_human_utterance": {
        const sessionInfo = wsToGdSession.get(ws);
        const sessionId = payload?.sessionId || sessionInfo?.sessionId;
        const text = payload?.text;
        const speakerName = payload?.speakerName || "Candidate";
        const userId = sessionInfo?.userId || payload?.userId || "user_1";

        if (!sessionId || !text) {
          ws.send(JSON.stringify({ type: "gd_error", text: "sessionId and text are required" }));
          return;
        }

        await processUtterance(sessionId, userId, speakerName, text, "human");
        break;
      }

      // 4. Voice Candidate Utterance (Base64 audio payload)
      case "gd_voice_input":
      case "human_voice_utterance":
      case "gd_human_voice": {
        const sessionInfo = wsToGdSession.get(ws);
        const sessionId = payload?.sessionId || sessionInfo?.sessionId;
        const speakerName = payload?.speakerName || "Candidate";
        const userId = sessionInfo?.userId || payload?.userId || "user_1";
        const audioBase64 = payload?.audio || payload?.audioBase64;
        const format = payload?.format || "webm";

        if (!sessionId || !audioBase64) {
          ws.send(JSON.stringify({ type: "gd_error", text: "sessionId and base64 audio are required for voice utterance" }));
          return;
        }

        const audioBuffer = Buffer.from(audioBase64, "base64");
        ws.send(JSON.stringify({ type: "gd_status", status: "transcribing", text: "Transcribing candidate audio..." }));

        const res = await processVoiceUtterance(sessionId, userId, speakerName, audioBuffer, format);
        ws.send(JSON.stringify({ type: "gd_stt_result", text: res.transcribedText }));
        break;
      }

      // 5. Manual Silence Nudge / Request Agent to Speak
      case "gd_nudge": {
        const sessionInfo = wsToGdSession.get(ws);
        if (sessionInfo?.sessionId) {
          await handleSilenceNudge(sessionInfo.sessionId);
        }
        break;
      }

      // 6. End GD Session & Generate Full Evaluation Report
      case "end_gd_session":
      case "gd_end": {
        const sessionInfo = wsToGdSession.get(ws);
        const sessionId = payload?.sessionId || sessionInfo?.sessionId;

        if (!sessionId) {
          ws.send(JSON.stringify({ type: "gd_error", text: "sessionId is required to end session" }));
          return;
        }

        ws.send(JSON.stringify({ type: "gd_status", status: "generating_report", text: "Analyzing session transcript and generating report..." }));

        const completedSession = await finalizeGdSession(sessionId);

        ws.send(
          JSON.stringify({
            type: "gd_report_ready",
            payload: {
              sessionId: completedSession.sessionId,
              report: completedSession.report,
              metrics: completedSession.metrics,
              transcript: completedSession.transcript,
            },
          })
        );
        break;
      }

      default:
        console.warn(`[GD WS] Unknown message type: ${type}`);
        ws.send(JSON.stringify({ type: "gd_error", text: `Unknown GD event type: ${type}` }));
    }
  } catch (err) {
    console.error(`[GD WS Error] Type: ${type}`, err);
    ws.send(
      JSON.stringify({
        type: "gd_error",
        text: err.message || "Internal GD processing error",
      })
    );
  }
}

/**
 * Handle Raw Binary Audio WebSocket Frames for GD Session (Candidate Voice Stream)
 */
export async function handleGdBinaryMessage(ws, binaryData) {
  const sessionInfo = wsToGdSession.get(ws);
  if (!sessionInfo?.sessionId) return false; // Not a GD session

  try {
    ws.send(JSON.stringify({ type: "gd_status", status: "transcribing", text: "Processing candidate voice stream..." }));
    const res = await processVoiceUtterance(
      sessionInfo.sessionId,
      sessionInfo.userId || "user_1",
      "Candidate",
      binaryData,
      "webm"
    );
    ws.send(JSON.stringify({ type: "gd_stt_result", text: res.transcribedText }));
    return true;
  } catch (err) {
    console.error("[GD Binary Voice Error]:", err.message);
    ws.send(JSON.stringify({ type: "gd_error", text: "Voice transcription error: " + err.message }));
    return true;
  }
}

/**
 * Handle WebSocket Disconnect for GD Sessions
 */
export function handleGdWsDisconnect(ws) {
  const sessionInfo = wsToGdSession.get(ws);
  if (sessionInfo) {
    unregisterWsClient(sessionInfo.sessionId, ws);
    wsToGdSession.delete(ws);
    console.log(`[GD WS] Client disconnected from session ${sessionInfo.sessionId}`);
  }
}
