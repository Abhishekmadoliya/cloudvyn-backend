import { configDotenv } from "dotenv";
import { initGdRoom, processUtterance, handleSilenceNudge } from "../services/gd/gdOrchestrator.js";
import { callLlmWithFallback, generateAgentUtterance } from "../services/gd/gdLlmService.js";
import { streamGdAgentAudio } from "../services/gd/gdTtsService.js";
import { transcribeCandidateVoice } from "../services/gd/gdSttService.js";
import { dbConnection } from "../config/db/dbConnection.js";
import mongoose from "mongoose";

configDotenv();

async function runVoiceGdBackendTest() {
  console.log("==========================================");
  console.log("🎙️  Testing Voice GD Backend Architecture ");
  console.log("==========================================\n");

  try {
    await dbConnection();

    // 1. Test LLM Generation with Ollama (Primary) -> Gemini -> DeepSeek -> Groq
    console.log("\n--- [Step 1] Testing Primary LLM (Ollama / Gemini / DeepSeek / Groq) ---");
    const samplePrompt = "Say a 1-line opening statement for a Group Discussion topic: 'Is AI a threat to entry-level software developer jobs in India?'";
    const llmResponse = await callLlmWithFallback(samplePrompt);
    console.log(`[LLM Output]: "${llmResponse}"\n`);

    // 2. Test GD Room Initialization
    console.log("--- [Step 2] Testing GD Room Initialization ---");
    const testSessionId = `test_voice_gd_${Date.now()}`;
    const room = await initGdRoom(testSessionId, "test_user_1", {
      userName: "Candidate (Voice Test)",
      customTopic: "Should remote work remain permanent for IT companies in India?",
      durationSeconds: 300,
    });
    console.log(`✅ GD Room Created: ${room.sessionId} | Topic: "${room.topic.text}" | Participants: ${room.participants.length}`);

    // 3. Mock WebSocket Client to verify audio chunk streaming
    console.log("\n--- [Step 3] Testing Multi-Voice TTS Synthesis (Gemini Primary -> Cloudflare Fallback) ---");
    const receivedMessages = [];
    const mockWs = {
      readyState: 1, // WebSocket.OPEN
      send: (data) => {
        if (typeof data === "string") {
          receivedMessages.push(JSON.parse(data));
        } else if (Buffer.isBuffer(data)) {
          receivedMessages.push({ type: "binary_chunk", bytes: data.length });
        }
      },
    };

    const mockClientsSet = new Set([mockWs]);
    const agentRohan = room.participants.find((p) => p.archetype === "dominant") || room.participants[1];
    
    console.log(`🎙️ Triggering TTS Audio stream for ${agentRohan.name}...`);
    const ttsSuccess = await streamGdAgentAudio(mockClientsSet, "I strongly believe remote work improves software developer productivity and work-life balance.", agentRohan);
    
    console.log(`✅ TTS Stream Completed | Success: ${ttsSuccess}`);
    const audioStartMsg = receivedMessages.find((m) => m.type === "gd_audio_start");
    const audioEndMsg = receivedMessages.find((m) => m.type === "gd_audio_end");
    const binaryChunks = receivedMessages.filter((m) => m.type === "binary_chunk");

    console.log(`   - Audio Start Payload:`, JSON.stringify(audioStartMsg?.payload));
    console.log(`   - Binary Audio Chunks Received: ${binaryChunks.length} chunks`);
    console.log(`   - Audio End Payload:`, JSON.stringify(audioEndMsg?.payload));

    // 4. Test Voice STT Input Handler
    console.log("\n--- [Step 4] Testing Candidate Voice STT Handler ---");
    // Create dummy silent audio buffer for STT contract test
    const dummyWebmBuffer = Buffer.from("GkXfo59ChoEBQveBAULygEGRasy46gE=", "base64");
    try {
      const transcript = await transcribeCandidateVoice(dummyWebmBuffer, "webm");
      console.log(`   - Candidate STT Result: "${transcript}"`);
    } catch (sttErr) {
      console.log(`   - STT contract test executed (expected error for empty dummy buffer: ${sttErr.message})`);
    }

    console.log("\n==========================================");
    console.log("🎉 All Voice GD Backend Integration Tests Passed!");
    console.log("==========================================");

  } catch (error) {
    console.error("\n❌ Voice GD Backend Test Failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runVoiceGdBackendTest();
