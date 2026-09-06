import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import Groq from "groq-sdk";
import { transcribeWithGoogle } from "../services/googleSTT.js";
import { transcribeWithWhisper } from "../services/whisper.service.js";

// Import modular services
import {
  generateWithFallback,
  streamGenerateWithFallback
} from "../services/aiFallback.service.js";
import { streamAudioToClient } from "../services/tts.service.js";
import { streamAudioWithPolly } from "../services/pollyTTS.service.js";
import {
  streamAudioWithPiper,
  initPersistentPiper
} from "../services/piper.service.js";
import { streamAudioWithCloudflare } from "../services/cloudflareTTS.service.js";
import {
  verifyToken,
  handleUserSession,
  getOrCreateInterview,
  finalizeInterview,
  checkWsEntitlement,
  incrementInterviewUsage
} from "../services/interview.service.js";
import userModel from "../models/userModel.js";
import {
  buildFirstQuestionPrompt,
  buildResponsePrompt,
  buildFeedbackPrompt
} from "../services/interviewPrompts.service.js";
import Interview from "../models/interviewModel.js";

import { handleGdWsMessage, handleGdWsDisconnect, handleGdBinaryMessage, isGdWsClient } from "./gdWsHandler.js";
import { fetchGitHubCandidateData } from "../services/github.service.js";
import { getCodingChallengeForInterview } from "../services/codingChallenge.service.js";
import { isCodingCategory } from "../utils/categoryClassification.js";

// Configuration
let _groq = null;
const getGroq = () => {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set in environment");
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
};

const connectionContexts = new Map();
const MAX_MESSAGES_PER_SESSION = 50;

// ── Reconnection Grace Period ─────────────────────────────────────────────
// When a client disconnects unexpectedly, we park the session here for 30s.
// If they reconnect with the same interviewId, we re-attach the context.
const disconnectedSessions = new Map(); // interviewId -> { context, timer }
const RECONNECT_WINDOW_MS = 30_000; // 30 seconds

/**
 * Unified TTS Strategy: Google TTS (Primary) -> Amazon Polly (Fallback 1) -> Cloudflare TTS (Fallback 2) -> Piper TTS (Fallback 3) -> Web Speech API (Fallback 4)
 */

/**
 * 
 * fallback tts 
 * 1. Google TTS
 * 2. Amazon Polly
 * 3. Cloudflare TTS
 * 4. Piper TTS
 * 5. Web Speech API
 */
async function playTtsWithFallback(ws, text, language = "en") {
  if (!text || ws.readyState !== 1) return;
  try {
    console.log(`🎙️ Attempting Google TTS (Primary, Language: ${language})...`);
    await streamAudioToClient(ws, text, language);
  } catch (googleErr) {
    console.warn("  Google TTS failed, attempting Amazon Polly fallback:", googleErr.message);
    try {
      await streamAudioWithPolly(ws, text, language);
    } catch (pollyErr) {
      console.warn("  Amazon Polly TTS failed, attempting Cloudflare fallback:", pollyErr.message);
      try {
        await streamAudioWithCloudflare(ws, text);
      } catch (cloudflareErr) {
        console.warn("  Cloudflare TTS failed, attempting Piper fallback:", cloudflareErr.message);
        try {
          await streamAudioWithPiper(ws, text);
        } catch (piperErr) {
          console.error("  All backend TTS services (Google, Polly, Cloudflare, Piper) failed:", piperErr.message);
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "tts_fallback", text }));
          }
        }
      }
    }
  }
}

export async function handleConnection(ws) {
  console.log("Client connected");

  ws.on("message", async (data, isBinary) => {
    // 1. HANDLE TEXT MESSAGES (Init Context, Updates, End)
    if (!isBinary) {
      try {
        const message = JSON.parse(data.toString());

        // ── ROUTE GD (GROUP DISCUSSION) MESSAGES ──
        if (
          message.type &&
          (message.type.startsWith("gd_") ||
            message.type === "init_gd_session" ||
            message.type === "human_utterance" ||
            message.type === "end_gd_session" ||
            message.type === "start_gd")
        ) {
          return handleGdWsMessage(ws, message);
        }

        // --- INITIALIZE CONTEXT ---
        if (message.type === "init_context") {
          const context = message.payload;
          console.log("📥 Received Interview Context from Frontend:", JSON.stringify(context, null, 2));
          const { token, sessionId, interviewId } = context;

          try {
            // ── Check for reconnection to a parked session ──
            const parkedSession = disconnectedSessions.get(interviewId);
            if (parkedSession) {
              // Cancel the auto-end timer
              clearTimeout(parkedSession.timer);
              disconnectedSessions.delete(interviewId);

              console.log(`🔄 Client reconnected to parked session ${interviewId} — resuming`);

              // Re-attach context to new WebSocket
              const restoredContext = parkedSession.context;
              restoredContext.piper = initPersistentPiper(ws); // Fresh piper for new ws
              connectionContexts.set(ws, restoredContext);

              ws.send(JSON.stringify({
                type: "session_resumed",
                payload: {
                  messageCount: restoredContext.messageCount || 0,
                  historyLength: restoredContext.history?.length || 0,
                  remainingTime: restoredContext.remainingTime || null
                }
              }));

              // Re-send the last AI reply so the candidate sees where they were
              const lastAiMsg = [...(restoredContext.history || [])].reverse().find(m => m.role === "assistant");
              if (lastAiMsg) {
                ws.send(JSON.stringify({
                  type: "ai_response",
                  text: lastAiMsg.content,
                  transcript: "",
                  timestamp: new Date().toISOString(),
                  isFinal: true
                }));
              }
              return; // Done — session is live again
            }

            // A. Authentication
            const decodedToken = await verifyToken(token);
            console.log(`  Token verified for UID: ${decodedToken.uid}`);

            // B. User Session (no longer rate-limits here — entitlement does that)
            const user = await handleUserSession(decodedToken.uid, sessionId);

            // B2. Entitlement Check — subscription-based gating
            const dbUser = await userModel.findOne({ firebaseUid: decodedToken.uid });
            if (dbUser) {
              const byokKey = context.byokKey || null;
              const entitlement = await checkWsEntitlement(dbUser, byokKey);

              if (!entitlement.allowed) {
                const errorPayload = {
                  type: "entitlement_error",
                  reason: entitlement.reason,
                  cap: entitlement.cap,
                  used: entitlement.used,
                  resetsAt: entitlement.resetsAt,
                  planKey: entitlement.planKey,
                };
                ws.send(JSON.stringify(errorPayload));
                setTimeout(() => ws.close(4003, entitlement.reason), 100);
                return;
              }

              // If BYOK session, store key in-memory ONLY (never persisted)
              if (entitlement.byok && byokKey) {
                console.log(`[BYOK] Session using BYOK key for user ${decodedToken.uid} (key NOT logged)`);
                // Will be attached to activeContext below
              }
            }

            // C. Interview Record Management
            const { interview, history, resumed } = await getOrCreateInterview(context, user);

            // D. Store active context
            const dbData = interview ? {
              resumeText: interview.resumeText || context.resumeText,
              resumeFileName: interview.resumeFileName || context.resumeFileName,
              jobDescription: interview.jobDescription || context.jobDescription,
              githubUrl: interview.githubUrl || context.githubUrl,
              githubData: interview.githubData || context.githubData,
              additionalLinks: interview.additionalLinks || context.additionalLinks,
              language: interview.language || context.language || "en",
              format: interview.format || context.format || "voice",
              currentProblem: interview.currentProblem || context.currentProblem || null,
              currentCode: interview.currentCode || context.currentCode || "",
              codeLanguage: interview.codeLanguage || context.codeLanguage || "javascript",
            } : {};

            const requiresCoding = isCodingCategory(context.category, context.targetRole);

            const activeContext = {
              ...context,
              ...dbData,
              requiresCoding,
              history: history || [],
              resumed: resumed,
              interviewId: interviewId || sessionId,
              messageCount: history ? history.length : 0,
              piper: initPersistentPiper(ws), // Initialize Piper for this session
              dbUserId: dbUser?._id || null, // For usage tracking on completion
              byokKey: context.byokKey || null, // In-memory only, discarded on close
            };

            // If GitHub URL is provided but repos not yet fetched, fetch now
            if (activeContext.githubUrl && !activeContext.githubData?.topRepos?.length) {
              try {
                console.log(`🐙 Resolving GitHub profile & repositories for ${activeContext.githubUrl}...`);
                const ghData = await fetchGitHubCandidateData(activeContext.githubUrl);
                if (ghData) {
                  activeContext.githubData = ghData;
                  if (interview && !interview.githubData?.topRepos?.length) {
                    interview.githubData = ghData;
                    interview.save().catch(e => console.warn("Could not cache githubData in interview doc:", e.message));
                  }
                }
              } catch (ghErr) {
                console.warn("GitHub fetch error during session init (continuing):", ghErr.message);
              }
            }

            // Only generate and send coding challenge if the category / role actually requires coding
            if (requiresCoding) {
              if (activeContext.currentProblem) {
                ws.send(JSON.stringify({ type: "coding_challenge", payload: activeContext.currentProblem }));
              } else {
                try {
                  const problem = await getCodingChallengeForInterview(activeContext);
                  if (problem) {
                    activeContext.currentProblem = problem;
                    ws.send(JSON.stringify({ type: "coding_challenge", payload: problem }));
                    if (interview) {
                      interview.currentProblem = problem;
                      interview.save().catch(e => console.warn("Could not cache problem in DB:", e.message));
                    }
                  }
                } catch (pErr) {
                  console.warn("Error preparing initial problem:", pErr.message);
                }
              }
            }

            connectionContexts.set(ws, activeContext);

            if (resumed) {
              console.log(`  Resumed existing interview ${interviewId} with ${history.length} messages`);
              ws.send(JSON.stringify({ type: "info", msg: "Interview resumed" }));
              return; // Skip first question for resumed sessions
            }

            console.log(`  Starting new interview session ${interviewId} (Language: ${activeContext.language || 'en'})`);
            ws.send(JSON.stringify({ type: "info", msg: "Context received and applied" }));

            // E. Generate & Play First Question
            const firstStatementPrompt = buildFirstQuestionPrompt(activeContext);

            const firstStatement = await generateWithFallback(firstStatementPrompt, activeContext);

            const currentContext = connectionContexts.get(ws);
            if (currentContext) {
              currentContext.history.push({ role: "assistant", content: firstStatement });
            }

            ws.send(JSON.stringify({
              type: "first_question",
              text: firstStatement,
              timestamp: new Date().toISOString()
            }));

            // TTS Strategy: Google Primary -> Cloudflare Fallback -> Piper Fallback -> Web Speech API
            await playTtsWithFallback(ws, firstStatement, activeContext.language || "en");

          } catch (err) {
            console.error("Initialization Error:", err.message);
            const errorMsg = err.message === "INTERVIEW_ALREADY_COMPLETED"
              ? "This interview session has already been completed."
              : "Authentication or session error.";

            ws.send(JSON.stringify({ type: "error", text: errorMsg }));
            setTimeout(() => ws.close(1008, err.message), 100);
          }
          return;
        }

        // --- TIME UPDATES ---
        if (message.type === "time_update") {
          const context = connectionContexts.get(ws);
          if (context) {
            context.remainingTime = message.payload.timeLeft;
            context.duration = message.payload.totalDuration;
          }
          return;
        }

        // --- END INTERVIEW (Manual/Auto) ---
        if (message.type === "end_interview") {
          const context = connectionContexts.get(ws);
          if (!context) return;

          // Prevent duplicate in-flight or re-entrant finalization
          if (context.isEnding || context.isCompleted) {
            console.log(`[WS] Duplicate end_interview received for ${context.interviewId} — ignoring`);
            return;
          }
          context.isEnding = true;

          if (!context.history?.length) {
            ws.send(JSON.stringify({ type: "feedback", payload: { score: 0, feedback: "No conversation recorded." } }));
            return;
          }

          const feedbackPrompt = buildFeedbackPrompt(context);

          try {
            let feedbackResponse = await generateWithFallback(feedbackPrompt, context);
            // Strip markdown code fences and any surrounding text
            feedbackResponse = feedbackResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            // Extract JSON object robustly — find first { to last }
            const jsonMatch = feedbackResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error("No JSON object found in AI response");
            }

            let feedbackData;
            try {
              feedbackData = JSON.parse(jsonMatch[0]);
            } catch (parseErr) {
              console.error("JSON parse failed, raw response:", feedbackResponse);
              throw new Error("Failed to parse feedback JSON");
            }

            // Normalize areasForImprovement to always be an array
            if (typeof feedbackData.areasForImprovement === 'string') {
              feedbackData.areasForImprovement = feedbackData.areasForImprovement
                .split(/[,;\n]+/)
                .map(s => s.trim())
                .filter(Boolean);
            }
            if (!Array.isArray(feedbackData.areasForImprovement)) {
              feedbackData.areasForImprovement = [];
            }

            // Ensure score is a number
            feedbackData.score = Number(feedbackData.score) || 0;

            ws.send(JSON.stringify({ type: "feedback", payload: feedbackData }));

            await finalizeInterview(context.interviewId, {
              feedback: feedbackData,
              history: context.history,
              duration: context.duration ? (context.duration - (context.remainingTime || 0)) : 0
            });

            // Increment interview usage counter on successful completion
            // (BYOK sessions skip quota consumption; abandoned sessions don't burn quota)
            // Idempotent: pass context.interviewId so quota is deducted at most once per interview session
            if (context.dbUserId && !context.byokKey) {
              await incrementInterviewUsage(context.dbUserId, context.interviewId);
            }
            context.isCompleted = true;

            // CRITICAL: Wait before closing so the feedback message is delivered to the client
            // ws.close() can race with the last ws.send() and the close frame arrives first
            setTimeout(() => {
              if (ws.readyState === 1) ws.close(1000, "Interview Completed");
            }, 1000);
          } catch (error) {
            console.error("Feedback Error:", error);
            // Send a fallback feedback instead of just closing with an error code
            try {
              ws.send(JSON.stringify({
                type: "feedback",
                payload: {
                  score: 0,
                  feedback: "We encountered an error generating your detailed feedback. Please check your interview history for details.",
                  areasForImprovement: []
                }
              }));

              if (context.dbUserId && !context.byokKey) {
                await incrementInterviewUsage(context.dbUserId, context.interviewId);
              }
              context.isCompleted = true;

              setTimeout(() => {
                if (ws.readyState === 1) ws.close(1000, "Interview Completed");
              }, 1000);
            } catch (sendErr) {
              ws.close(1011, "Feedback Error");
            }
          }
          return;
        }

        // --- REQUEST CODING CHALLENGE DIRECTLY ---
        if (message.type === "request_coding_challenge") {
          const context = connectionContexts.get(ws);
          if (context && isCodingCategory(context.category, context.targetRole)) {
            try {
              const problem = context.currentProblem || await getCodingChallengeForInterview(context);
              context.currentProblem = problem;
              ws.send(JSON.stringify({ type: "coding_challenge", payload: problem }));
              Interview.findOneAndUpdate(
                { interviewId: context.interviewId },
                { currentProblem: problem }
              ).catch(e => console.warn("Could not persist requested problem to DB:", e.message));
            } catch (err) {
              console.error("Error generating coding challenge:", err);
            }
          }
          return;
        }

        // --- CODE SYNC ---
        if (message.type === "code_update") {
          const context = connectionContexts.get(ws);
          if (context) {
            context.currentCode = message.payload.code;
            context.codeLanguage = message.payload.language;
            Interview.findOneAndUpdate(
              { interviewId: context.interviewId },
              { currentCode: message.payload.code, codeLanguage: message.payload.language }
            ).catch(() => { });
          }
          return;
        }

        // --- RUN CODE (Piston API) ---
        if (message.type === "run_code") {
          const { code, language } = message.payload;
          try {
            const lang = language || "javascript";
            const response = await fetch("https://emkc.org/api/v2/piston/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                language: lang,
                version: "*",
                files: [{ name: "main", content: code }]
              })
            });
            const result = await response.json();

            ws.send(JSON.stringify({
              type: "code_result",
              payload: {
                stdout: result.run?.stdout,
                stderr: result.run?.stderr,
                code: result.run?.code,
                output: result.run?.output
              }
            }));

            const context = connectionContexts.get(ws);

            // --- AI CODE EVALUATION & SPOKEN FEEDBACK ---
            if (context) {
              context.currentCode = code;
              context.codeLanguage = lang;
              const outputSummary = result.run?.output || result.run?.stderr || "No console output";

              context.history.push({
                role: "user",
                content: `[System: The candidate executed their code in ${lang}.\nOutput:\n${outputSummary.substring(0, 400)}]`
              });

              const isHindi = context.language === "hi" || context.language === "hi-IN";
              const evalPrompt = `You are the AI technical interviewer at CloudVyn evaluating the candidate's code that they just executed.

=== INTERVIEW CONTEXT ===
• Role: ${context.targetRole || "Software Engineer"}
• Difficulty: ${context.difficultyLevel || "Medium"}
• Language: ${isHindi ? "Hindi / Hinglish" : "English"}

=== ACTIVE PROBLEM ===
${context.currentProblem ? `Title: ${context.currentProblem.title}\nDescription: ${context.currentProblem.description}\nRequirements: ${(context.currentProblem.requirements || []).join("; ")}` : "General coding task"}

=== CANDIDATE'S CODE (${lang}) ===
${code}

=== EXECUTION OUTPUT / ERRORS ===
${outputSummary}

=== YOUR TASK ===
Analyze the candidate's code and its execution. Provide:
1. "spokenFeedback": A natural, professional verbal reaction from the interviewer (40-70 words, ${isHindi ? "in conversational Hindi/Hinglish" : "in English"}, no markdown, no bullet points). Comment on whether the solution works, point out bugs/syntax issues if any, or guide them on edge cases and complexity.
2. "status": "pass" | "partial" | "error"
3. "summary": "<1-2 sentence assessment>"
4. "strengths": ["<strength 1>", "<strength 2>"]
5. "suggestions": ["<suggestion 1>"]
6. "timeComplexity": "<e.g. O(N)>"
7. "spaceComplexity": "<e.g. O(1)>"

Respond with ONLY valid JSON:
{
  "status": "pass",
  "spokenFeedback": "...",
  "summary": "...",
  "strengths": ["..."],
  "suggestions": ["..."],
  "timeComplexity": "O(N)",
  "spaceComplexity": "O(1)"
}`;

              try {
                const evalRaw = await generateWithFallback(evalPrompt, context);
                const cleaned = evalRaw.replace(/```json/g, "").replace(/```/g, "").trim();
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const evalData = JSON.parse(jsonMatch[0]);

                  // Send structured review for UI card
                  ws.send(JSON.stringify({
                    type: "code_ai_review",
                    payload: evalData,
                  }));

                  if (evalData.spokenFeedback) {
                    context.history.push({ role: "assistant", content: evalData.spokenFeedback });

                    // Send text to conversation panel
                    ws.send(JSON.stringify({
                      type: "ai_response",
                      text: evalData.spokenFeedback,
                      transcript: `[Candidate executed code in ${lang}]`,
                      timestamp: new Date().toISOString(),
                      isFinal: true
                    }));

                    // Speak aloud via TTS with full fallback chain (Google -> Piper -> Cloudflare -> WebSpeech)
                    await playTtsWithFallback(ws, evalData.spokenFeedback, context.language || "en");
                  }
                }
              } catch (evalErr) {
                console.warn("AI code evaluation failed:", evalErr.message);
              }
            }
          } catch (err) {
            console.error("Code execution error:", err);
            ws.send(JSON.stringify({ type: "code_result", payload: { error: "Failed to execute code: " + err.message } }));
          }
          return;
        }

      } catch (error) {
        console.error("Text processing error:", error);
      }
      return;
    }

    // 2. HANDLE BINARY AUDIO DATA
    if (isGdWsClient(ws)) {
      const handled = await handleGdBinaryMessage(ws, data);
      if (handled) return;
    }

    const currentContext = connectionContexts.get(ws);
    if (!currentContext) return;

    if ((currentContext.messageCount || 0) >= MAX_MESSAGES_PER_SESSION) {
      ws.send(JSON.stringify({ type: "error", text: "Session limit reached.", code: "SESSION_LIMIT_EXCEEDED" }));
      return;
    }

    // Detect audio format from magic bytes (VAD sends WAV, MediaRecorder sends WebM)
    const header = Buffer.from(data).slice(0, 4);
    const isWav = header.toString('ascii', 0, 4) === 'RIFF';
    const ext = isWav ? 'wav' : 'webm';
    const filename = `temp-${uuidv4()}.${ext}`;
    try {
      fs.writeFileSync(filename, data);

      // A. Transcription (Groq Whisper -> Local Python Whisper -> Google STT Fallback)
      let transcribedText = "";
      try {
        const targetLanguage = currentContext.language === "hi" ? "hi" : "en";
        const googleSttLang = currentContext.language === "hi" ? "hi-IN" : "en-US";
        console.log(`🔄 Starting Groq Whisper STT (Primary, Language: ${targetLanguage})...`);
        const transcript = await getGroq().audio.transcriptions.create({
          file: fs.createReadStream(filename),
          model: "whisper-large-v3",
          language: targetLanguage,
          temperature: 0.0,
          response_format: "json",
          prompt: "Candidate speaking in a live professional interview session.",
        });
        transcribedText = transcript.text || "";
      } catch (groqErr) {
        console.warn("  Groq Whisper STT failed, trying Local Python Whisper:", groqErr.message);
        try {
          console.log("🔄 Starting Local Python Whisper STT...");
          transcribedText = await transcribeWithWhisper(filename);
        } catch (whisperErr) {
          console.warn("  Local Whisper STT failed, falling back to Google:", whisperErr.message);
          try {
            const googleSttLang = currentContext.language === "hi" ? "hi-IN" : "en-US";
            transcribedText = await transcribeWithGoogle(filename, googleSttLang);
          } catch (googleErr) {
            console.error("  All STT services failed:", googleErr.message);
          }
        }
      }

      // Filter out empty transcripts and known Whisper hallucinations on background noise/silence
      const WHISPER_HALLUCINATIONS = [
        /^(thank\s*you|thanks|thank\s*you\s*very\s*much)[\.\!\?]?$/i,
        /^(thanks?\s*for\s*watching)[\.\!\?]?$/i,
        /^(hello|hi|hey)[\.\!\?]?$/i,
        /^(bye|goodbye|see\s*you)[\.\!\?]?$/i,
        /^(you|yeah|okay|ok|uh|um|so|ah)[\.\!\?]?$/i,
        /^(subtitles?\s*by|captioned\s*by|translated\s*by|transcribed\s*by)[\.\!\?]?$/i,
        /^(subscribe|like\s*and\s*subscribe)[\.\!\?]?$/i,
        /^(mbc|amara\.org)[\.\!\?]?$/i,
        /^[.\s\-_,!?…]+$/,
      ];

      const cleanTranscript = (transcribedText || "").trim();
      const isHallucination = !cleanTranscript || WHISPER_HALLUCINATIONS.some(rx => rx.test(cleanTranscript));

      if (isHallucination) {
        console.log(`🔇 Discarded ambient noise / Whisper hallucination: "${cleanTranscript}"`);
        return;
      }

      // B. Update History & Message Count
      currentContext.history.push({ role: "user", content: transcribedText });
      currentContext.messageCount++;

      // C. Generate Text Response (Streaming to UI)
      console.log(`🤖 Generating AI response (Language: ${currentContext.language || 'en'})...`);
      const codeContext = currentContext.currentCode ? `Candidate's Current Code in ${currentContext.codeLanguage || 'javascript'}:\n${currentContext.currentCode}` : "";

      const responsePrompt = buildResponsePrompt(currentContext, transcribedText, codeContext);

      let fullResponse = "";
      try {
        fullResponse = await streamGenerateWithFallback(responsePrompt, currentContext, (token) => {
          // Strip trigger tokens from live stream
          const cleanToken = token.replace(/\[TRIGGER_CODING_CHALLENGE\]/g, "");
          if (cleanToken && ws.readyState === 1) ws.send(JSON.stringify({ type: "ai_response_chunk", text: cleanToken }));
        });

        // Check if AI triggered or mentioned a coding challenge
        const codingKeywordsRegex = /(coding|problem|challenge|task|write code|code editor|implement|build a component|write a function)/i;
        const shouldTriggerChallenge = fullResponse.includes("[TRIGGER_CODING_CHALLENGE]") || codingKeywordsRegex.test(fullResponse);
        fullResponse = fullResponse.replace(/\[TRIGGER_CODING_CHALLENGE\]/g, "").trim();

        const requiresCoding = isCodingCategory(currentContext.category, currentContext.targetRole);

        if (requiresCoding && (shouldTriggerChallenge || !currentContext.currentProblem)) {
          try {
            if (!currentContext.currentProblem) {
              console.log("🎯 AI assigned coding challenge to candidate!");
              const problem = await getCodingChallengeForInterview(currentContext);
              currentContext.currentProblem = problem;
              ws.send(JSON.stringify({ type: "coding_challenge", payload: problem }));
              Interview.findOneAndUpdate(
                { interviewId: currentContext.interviewId },
                { currentProblem: problem }
              ).catch(e => console.warn("Could not save problem to DB:", e.message));
            } else {
              // Re-send existing problem just in case client missed it
              ws.send(JSON.stringify({ type: "coding_challenge", payload: currentContext.currentProblem }));
            }
          } catch (pErr) {
            console.warn("Coding challenge generation error:", pErr.message);
          }
        }

        // Update history with finalized response
        currentContext.history.push({ role: "assistant", content: fullResponse });

        // Signal full text for UI
        ws.send(JSON.stringify({
          type: "ai_response",
          text: fullResponse,
          transcript: transcribedText,
          timestamp: new Date().toISOString(),
          isFinal: true
        }));
      } catch (genErr) {
        console.error("  Generation error:", genErr.message);
        throw genErr;
      }

      // D. TTS Strategy: Google Primary -> Cloudflare Fallback -> Piper Fallback -> Web Speech API
      await playTtsWithFallback(ws, fullResponse, currentContext.language || "en");

    } catch (err) {
      console.error("Audio processing error:", err);
      ws.send(JSON.stringify({ type: "error", text: "Failed to process audio session." }));
    } finally {
      if (fs.existsSync(filename)) fs.unlinkSync(filename);
    }
  });

  ws.on("close", async (code, reason) => {
    handleGdWsDisconnect(ws);

    const context = connectionContexts.get(ws);
    connectionContexts.delete(ws);

    if (!context) return;

    // Kill current piper instance (a new one is created on reconnect)
    if (context.piper) {
      try { context.piper.kill(); } catch (e) { /* ignore */ }
      context.piper = null;
    }

    // ── Intentional close codes — do NOT offer reconnection ──
    // 1000 = normal close (interview completed), 1008 = policy (auth fail),
    // 4001/4003 = app-level refusal, 1011 = server error after feedback sent
    const intentionalCodes = [1000, 1008, 4001, 4003, 1011];
    if (intentionalCodes.includes(code)) {
      console.log(`✅ Intentional close (${code}) for ${context.interviewId} — no grace period`);
      if (context.interviewId) {
        const existing = await Interview.findOne({ interviewId: context.interviewId });
        if (existing?.status === "started") {
          await finalizeInterview(context.interviewId, {
            status: "completed",
            history: context.history,
            duration: context.duration ? (context.duration - (context.remainingTime || 0)) : 0
          });
        }
      }
      return;
    }

    // ── Unexpected disconnect — start 30s grace period ──
    if (context.interviewId) {
      console.log(`⏳ Unexpected disconnect for ${context.interviewId} — starting ${RECONNECT_WINDOW_MS / 1000}s grace period`);

      // If there's already a parked session for this ID (shouldn't happen, but safety), clear it
      const existing = disconnectedSessions.get(context.interviewId);
      if (existing) clearTimeout(existing.timer);

      const timer = setTimeout(async () => {
        console.log(`⌛ Grace period expired for ${context.interviewId} — finalizing interview`);
        disconnectedSessions.delete(context.interviewId);

        try {
          const dbInterview = await Interview.findOne({ interviewId: context.interviewId });
          if (dbInterview?.status === "started") {
            await finalizeInterview(context.interviewId, {
              status: "completed",
              history: context.history,
              duration: context.duration ? (context.duration - (context.remainingTime || 0)) : 0
            });
          }
        } catch (err) {
          console.error(`Error finalizing after grace period for ${context.interviewId}:`, err);
        }
      }, RECONNECT_WINDOW_MS);

      disconnectedSessions.set(context.interviewId, { context, timer });
    }
  });
}
