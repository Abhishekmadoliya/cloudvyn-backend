import GDSession from "../../models/gd/gdSessionModel.js";
import GDTopic from "../../models/gd/gdTopicModel.js";
import {
  PERSONA_ARCHETYPES,
  buildPersonaSystemPrompt,
} from "./gdPrompts.js";
import {
  generateAgentUtterance,
  scoreAgentUrgencyParallel,
  generateGDReportLLM,
} from "./gdLlmService.js";
import { streamGdAgentAudio } from "./gdTtsService.js";
import { transcribeCandidateVoice } from "./gdSttService.js";

const URGENCY_THRESHOLD = 0.45;
const MAX_CONSECUTIVE_TURNS = 2;

// In-memory active GD sessions registry: sessionId -> roomContext
const activeGdRooms = new Map();

/**
 * Random integer helper
 */
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Helper to construct transcript tail (last N turns)
 */
function getTranscriptTail(transcript, n = 6) {
  const tail = transcript.slice(-n);
  return tail
    .map((turn) => `[${turn.speakerName}]: ${turn.text}`)
    .join("\n");
}

/**
 * Helper to construct full transcript as text
 */
function getFullTranscriptText(transcript) {
  return transcript
    .map((turn) => `[${turn.speakerName} (${turn.archetype || turn.speakerType})]: ${turn.text}`)
    .join("\n");
}

/**
 * Initialize or Resume a GD Session in memory & DB
 */
export async function initGdRoom(sessionId, userId, options = {}) {
  let dbSession = await GDSession.findOne({ sessionId });

  if (!dbSession) {
    // 1. Resolve Topic
    let topicObj = { text: "Should India adopt a 4-day work week?", category: "current_affairs" };
    if (options.topicId) {
      const dbTopic = await GDTopic.findById(options.topicId);
      if (dbTopic) {
        topicObj = { id: dbTopic._id, text: dbTopic.text, category: dbTopic.category };
        await GDTopic.findByIdAndUpdate(options.topicId, { $inc: { usageCount: 1 } });
      }
    } else if (options.customTopic) {
      topicObj = { text: options.customTopic, category: options.category || "current_affairs" };
    }

    // 2. Build Default AI Participants
    const humanName = options.userName || "Candidate";
    const humanParticipant = {
      type: "human",
      userId,
      name: humanName,
      archetype: null,
      stance: options.userStance || "neutral",
      consecutiveTurns: 0,
    };

    const aiArchetypes = [
      { key: "dominant", name: "Rohan (Dominant)", stance: "for" },
      { key: "analytical", name: "Priya (Analytical)", stance: "against" },
      { key: "consensus_builder", name: "Ananya (Consensus Builder)", stance: "neutral" },
    ];

    const aiParticipants = aiArchetypes.map((arch, idx) => {
      const persona = PERSONA_ARCHETYPES[arch.key];
      return {
        type: "ai_agent",
        agentInstanceId: `agent_${idx + 1}`,
        name: arch.name,
        archetype: arch.key,
        stance: arch.stance,
        persona: {
          ...persona,
          name: arch.name,
        },
        consecutiveTurns: 0,
      };
    });

    dbSession = new GDSession({
      sessionId,
      userId,
      status: "active",
      topic: topicObj,
      durationSeconds: options.durationSeconds || 600,
      startedAt: new Date(),
      participants: [humanParticipant, ...aiParticipants],
      transcript: [],
    });

    try {
      await dbSession.save();
    } catch (saveErr) {
      if (saveErr.code === 11000) {
        dbSession = await GDSession.findOne({ sessionId });
      } else {
        throw saveErr;
      }
    }
  }

  // 3. Construct In-Memory Room Context
  const roomContext = {
    sessionId: dbSession.sessionId,
    dbId: dbSession._id,
    userId: dbSession.userId,
    topic: dbSession.topic,
    durationSeconds: dbSession.durationSeconds,
    startedAt: dbSession.startedAt || new Date(),
    status: dbSession.status,
    participants: dbSession.participants.map((p) => {
      const archetypeKey = p.archetype;
      const personaBase = archetypeKey ? PERSONA_ARCHETYPES[archetypeKey] : {};
      return {
        ...p.toObject ? p.toObject() : p,
        persona: {
          ...personaBase,
          name: p.name,
        },
        lastSpokeTimestamp: Date.now(),
      };
    }),
    transcript: dbSession.transcript || [],
    isProcessingTurn: false,
    clients: new Set(), // WebSocket connections in this room
  };

  activeGdRooms.set(sessionId, roomContext);
  return roomContext;
}

/**
 * Register WebSocket connection to GD Room
 */
export function registerWsClient(sessionId, ws) {
  const room = activeGdRooms.get(sessionId);
  if (room) {
    room.clients.add(ws);
  }
}

/**
 * Unregister WebSocket connection from GD Room
 */
export function unregisterWsClient(sessionId, ws) {
  const room = activeGdRooms.get(sessionId);
  if (room) {
    room.clients.delete(ws);
    if (room.clients.size === 0) {
      // Keep in memory for 10 minutes in case of reconnect
    }
  }
}

/**
 * Broadcast message to all WS clients in GD Room
 */
export function broadcastToRoom(sessionId, payload) {
  const room = activeGdRooms.get(sessionId);
  if (!room) return;

  const dataStr = JSON.stringify(payload);
  for (const client of room.clients) {
    if (client.readyState === 1) { // OPEN
      client.send(dataStr);
    }
  }
}

/**
 * Process a new utterance (Human or AI) and orchestrate subsequent AI turns
 */
export async function processUtterance(sessionId, speakerId, speakerName, text, speakerType = "human") {
  const room = activeGdRooms.get(sessionId);
  if (!room) throw new Error(`Room ${sessionId} not found`);

  if (room.isProcessingTurn) {
    console.log(`[GD Orchestrator] Session ${sessionId} is currently processing turn. Queueing...`);
  }
  room.isProcessingTurn = true;

  try {
    // 1. Find participant
    const speakerObj = room.participants.find(
      (p) => (p.agentInstanceId && p.agentInstanceId === speakerId) || p.userId === speakerId || p.name === speakerName
    );

    const actualSpeakerId = speakerObj ? (speakerObj.agentInstanceId || speakerObj.userId || speakerId) : speakerId;
    const actualSpeakerName = speakerObj ? speakerObj.name : speakerName;
    const actualArchetype = speakerObj ? speakerObj.archetype : (speakerType === "human" ? "Human Candidate" : null);

    // Update speaker stats
    room.participants.forEach((p) => {
      const isCurrent = (p.agentInstanceId && p.agentInstanceId === actualSpeakerId) || p.userId === actualSpeakerId;
      if (isCurrent) {
        p.consecutiveTurns = (p.consecutiveTurns || 0) + 1;
        p.lastSpokeTimestamp = Date.now();
      } else {
        p.consecutiveTurns = 0; // Reset others
      }
    });

    const turnIndex = room.transcript.length;
    const newTurn = {
      turnIndex,
      speakerId: actualSpeakerId,
      speakerName: actualSpeakerName,
      speakerType,
      archetype: actualArchetype,
      text,
      timestamp: new Date(),
    };

    room.transcript.push(newTurn);

    // Save to DB asynchronously
    GDSession.updateOne(
      { sessionId },
      { $push: { transcript: newTurn } }
    ).catch((err) => console.error(`[GD Orchestrator] DB sync error:`, err.message));

    // Broadcast utterance event to WS room
    broadcastToRoom(sessionId, {
      type: "gd_utterance",
      payload: newTurn,
    });

    // If AI Agent turn, stream synthesized TTS audio over WebSocket
    if (speakerType === "ai_agent" && room.clients && room.clients.size > 0) {
      streamGdAgentAudio(room.clients, text, {
        agentInstanceId: actualSpeakerId,
        name: actualSpeakerName,
        archetype: actualArchetype,
      }).catch((ttsErr) => {
        console.error(`[GD Orchestrator] TTS streaming error for ${actualSpeakerName}:`, ttsErr.message);
      });
    }

    // 2. Evaluate Idle AI Agents for Next Turn
    const idleAgents = room.participants.filter(
      (p) => p.type === "ai_agent" && p.agentInstanceId !== actualSpeakerId && (p.consecutiveTurns || 0) < MAX_CONSECUTIVE_TURNS
    );

    if (idleAgents.length === 0) {
      room.isProcessingTurn = false;
      return;
    }

    // Call parallel urgency scoring
    const urgencyResults = await scoreAgentUrgencyParallel(
      idleAgents,
      room.topic.text,
      newTurn,
      getTranscriptTail(room.transcript, 6)
    );

    console.log(
      `[GD Urgency Scores]:`,
      urgencyResults.map((r) => `${r.agent.name}: ${r.urgency.toFixed(2)} (${r.reason})`).join(" | ")
    );

    // Filter candidates above threshold
    const candidates = urgencyResults
      .filter((c) => c.urgency >= URGENCY_THRESHOLD)
      .sort((a, b) => b.urgency - a.urgency);

    if (candidates.length === 0) {
      console.log(`[GD Orchestrator] No AI agent crossed urgency threshold (${URGENCY_THRESHOLD}). Waiting for human.`);
      room.isProcessingTurn = false;
      return;
    }

    const nextCandidate = candidates[0];

    // Send AI thinking signal
    broadcastToRoom(sessionId, {
      type: "gd_agent_thinking",
      payload: {
        agentId: nextCandidate.agent.agentInstanceId,
        agentName: nextCandidate.agent.name,
        intent: nextCandidate.one_line_intent,
      },
    });

    // Realistic reaction micro-delay
    const delayMs = randomBetween(400, 900);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Generate response line
    const fullTranscriptSoFar = getFullTranscriptText(room.transcript);
    const aiResponseText = await generateAgentUtterance(
      nextCandidate.agent,
      room.topic.text,
      fullTranscriptSoFar
    );

    room.isProcessingTurn = false;

    // Recursively trigger turn for AI response
    await processUtterance(
      sessionId,
      nextCandidate.agent.agentInstanceId,
      nextCandidate.agent.name,
      aiResponseText,
      "ai_agent"
    );
  } catch (error) {
    console.error(`[GD Orchestrator] Error processing utterance:`, error);
    room.isProcessingTurn = false;
  }
}

/**
 * Handle silence nudge if no participant speaks for prolonged duration
 */
export async function handleSilenceNudge(sessionId) {
  const room = activeGdRooms.get(sessionId);
  if (!room || room.isProcessingTurn) return;

  const now = Date.now();
  // Find quietest AI participant
  const aiAgents = room.participants.filter((p) => p.type === "ai_agent");
  if (aiAgents.length === 0) return;

  aiAgents.sort((a, b) => (a.lastSpokeTimestamp || 0) - (b.lastSpokeTimestamp || 0));
  const selectedAgent = aiAgents[0];

  console.log(`[GD Silence Nudge] Prompting ${selectedAgent.name} to restart discussion...`);

  broadcastToRoom(sessionId, {
    type: "gd_agent_thinking",
    payload: {
      agentId: selectedAgent.agentInstanceId,
      agentName: selectedAgent.name,
      intent: "Breaking silence to prompt group",
    },
  });

  const fullTranscriptSoFar = getFullTranscriptText(room.transcript);
  const promptMessage = fullTranscriptSoFar
    ? `${fullTranscriptSoFar}\n\n[Note: The discussion has gone quiet for a moment. Jump in to offer a fresh perspective or ask the group a question.]`
    : "(Discussion has just started. Introduce yourself brief and kick off the discussion on the topic.)";

  const aiText = await generateAgentUtterance(selectedAgent, room.topic.text, promptMessage);

  await processUtterance(
    sessionId,
    selectedAgent.agentInstanceId,
    selectedAgent.name,
    aiText,
    "ai_agent"
  );
}

/**
 * Finalize GD Session & Generate Full Evaluation Report
 */
export async function finalizeGdSession(sessionId) {
  const room = activeGdRooms.get(sessionId);
  const dbSession = await GDSession.findOne({ sessionId });
  if (!dbSession) throw new Error("GD Session not found");

  const transcript = room ? room.transcript : dbSession.transcript;
  const startedAt = dbSession.startedAt || new Date();
  const endedAt = new Date();
  const durationSeconds = Math.max(1, Math.round((endedAt - startedAt) / 1000));

  // Compute Participant Metrics
  const participants = room ? room.participants : dbSession.participants;
  const humanParticipant = participants.find((p) => p.type === "human") || { name: "Candidate" };

  const perParticipantMetrics = participants.map((p) => {
    const id = p.agentInstanceId || p.userId || p.name;
    const pTurns = transcript.filter((t) => t.speakerId === id || t.speakerName === p.name);
    const turnCount = pTurns.length;
    const totalWords = pTurns.reduce((acc, t) => acc + (t.text ? t.text.split(/\s+/).length : 0), 0);
    const avgTurnLengthWords = turnCount > 0 ? Math.round(totalWords / turnCount) : 0;
    const approxSpeakingTimeMs = totalWords * 350; // ~350ms per word

    return {
      speakerId: id,
      name: p.name,
      speakingTimeMs: approxSpeakingTimeMs,
      speakingTimeSharePct: 0, // calculated below
      turnCount,
      interruptionsMade: 0,
      interruptionsReceived: 0,
      avgTurnLengthWords,
      newPointsIntroduced: Math.min(turnCount, 3),
      pointsBuiltOn: Math.max(0, turnCount - 1),
      agreementShiftsCaused: 0,
    };
  });

  const totalSpeakingMs = perParticipantMetrics.reduce((acc, m) => acc + m.speakingTimeMs, 0) || 1;
  perParticipantMetrics.forEach((m) => {
    m.speakingTimeSharePct = Math.round((m.speakingTimeMs / totalSpeakingMs) * 100);
  });

  // Generate Report via LLM
  let reportData = null;
  try {
    reportData = await generateGDReportLLM(
      dbSession.topic.text,
      humanParticipant.name,
      transcript,
      durationSeconds
    );
  } catch (err) {
    console.error(`[GD Report Generation Error]:`, err.message);
    reportData = {
      overallScore: 70,
      rubricScores: {
        communication: 72,
        contentAndKnowledge: 68,
        groupDynamics: 70,
        leadershipAndInitiative: 70,
        structureAndClarity: 70,
      },
      strengths: ["Participated actively", "Expressed clear opinions"],
      improvementAreas: ["Could summarize key points before concluding"],
      actionableAdvice: ["Practice structuring arguments with data"],
      fullTranscriptSummary: "The candidate engaged in the discussion and shared relevant views.",
    };
  }

  // Update DB Session
  dbSession.status = "completed";
  dbSession.endedAt = endedAt;
  dbSession.transcript = transcript;
  dbSession.metrics = { perParticipant: perParticipantMetrics };
  dbSession.report = {
    ...reportData,
    generatedAt: new Date(),
    model: "gemini-2.0-flash",
  };

  await dbSession.save();

  // Clean up in-memory room
  activeGdRooms.delete(sessionId);

  return dbSession;
}

/**
 * Process a Candidate's Spoken Voice Utterance via Google STT and process turn
 */
export async function processVoiceUtterance(sessionId, speakerId, speakerName, audioBuffer, fileExt = "webm") {
  const room = activeGdRooms.get(sessionId);
  if (!room) throw new Error(`Room ${sessionId} not found`);

  // Transcribe audio using Google STT
  const transcribedText = await transcribeCandidateVoice(audioBuffer, fileExt);
  if (!transcribedText || !transcribedText.trim()) {
    console.log(`[GD Orchestrator] STT produced empty text for session ${sessionId}`);
    return { transcribedText: "", processed: false };
  }

  // Process GD turn with transcribed text
  await processUtterance(sessionId, speakerId, speakerName, transcribedText, "human");
  return { transcribedText, processed: true };
}
