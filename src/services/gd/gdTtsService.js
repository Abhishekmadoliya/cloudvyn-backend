import { streamAudioToClient } from "../tts.service.js";
import { streamAudioWithCloudflare } from "../cloudflareTTS.service.js";
import { synthesizeSpeechWithPolly, POLLY_VOICES } from "../pollyTTS.service.js";

// Persona voice configuration map
const PERSONA_VOICE_MAP = {
  dominant: {
    googleVoice: "en-US-Studio-O", // Deep male voice
    pollyVoice: "Matthew", // Neural Male
    cloudflareVoice: "orion",
  },
  analytical: {
    googleVoice: "en-US-Studio-F", // Crisp analytical female voice
    pollyVoice: "Danielle", // Crisp Analytical Neural Female
    cloudflareVoice: "asteria",
  },
  consensus_builder: {
    googleVoice: "en-US-Neural2-F", // Warm consensus female voice
    pollyVoice: "Kajal", // Warm Neural Indian English / Bilingual
    cloudflareVoice: "luna",
  },
};

/**
 * Stream synthesized TTS audio for an AI persona utterance to room WebSocket clients
 * Strategy: Gemini / Google TTS (Primary) -> Amazon Polly (Fallback 1) -> Cloudflare TTS (Fallback 2)
 */
export async function streamGdAgentAudio(wsClients, text, agentInfo = {}) {
  if (!text || !wsClients || wsClients.size === 0) return;

  const archetype = agentInfo.archetype || "dominant";
  const voiceConfig = PERSONA_VOICE_MAP[archetype] || PERSONA_VOICE_MAP.dominant;

  const audioStartPayload = JSON.stringify({
    type: "gd_audio_start",
    payload: {
      agentInstanceId: agentInfo.agentInstanceId || "agent_1",
      speakerName: agentInfo.name || "AI Agent",
      archetype,
      format: "mp3",
    },
  });

  const audioEndPayload = JSON.stringify({
    type: "gd_audio_end",
    payload: {
      agentInstanceId: agentInfo.agentInstanceId || "agent_1",
      speakerName: agentInfo.name || "AI Agent",
    },
  });

  // Notify all clients in the room that audio streaming has started
  for (const clientWs of wsClients) {
    if (clientWs.readyState === 1) {
      clientWs.send(audioStartPayload);
    }
  }

  let synthSuccess = false;

  // 1. Primary: Gemini / Google Cloud TTS
  try {
    console.log(`[GD TTS] 🎙️ Synthesizing primary TTS (Google/Gemini) for ${agentInfo.name || "Agent"}...`);
    const API_KEY = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      throw new Error("Missing GOOGLE_TTS_API_KEY / GEMINI_API_KEY");
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            ssml: `<speak><prosody rate="1.1">${text}</prosody></speak>`,
          },
          voice: {
            languageCode: "en-US",
            name: voiceConfig.googleVoice,
          },
          audioConfig: {
            audioEncoding: "MP3",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google TTS API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const audioContent = Buffer.from(data.audioContent, "base64");

    // Broadcast audio buffer in 32KB chunks over WebSocket
    const chunkSize = 1024 * 32;
    for (let i = 0; i < audioContent.length; i += chunkSize) {
      const chunk = audioContent.slice(i, i + chunkSize);
      for (const clientWs of wsClients) {
        if (clientWs.readyState === 1) {
          clientWs.send(chunk);
        }
      }
    }

    synthSuccess = true;
    console.log(`[GD TTS] ✅ Gemini/Google TTS broadcast completed for ${agentInfo.name}`);
  } catch (primaryErr) {
    console.warn(`[GD TTS] ⚠️ Primary Google/Gemini TTS failed: ${primaryErr.message}. Attempting Amazon Polly TTS fallback...`);

    // 2. Fallback 1: Amazon Polly TTS
    try {
      const audioBuffer = await synthesizeSpeechWithPolly(text, {
        voiceId: voiceConfig.pollyVoice,
        archetype,
      });

      const chunkSize = 1024 * 32;
      for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        const chunk = audioBuffer.slice(i, i + chunkSize);
        for (const clientWs of wsClients) {
          if (clientWs.readyState === 1) {
            clientWs.send(chunk);
          }
        }
      }

      synthSuccess = true;
      console.log(`[GD TTS] ✅ Amazon Polly TTS fallback broadcast completed for ${agentInfo.name}`);
    } catch (pollyErr) {
      console.warn(`[GD TTS] ⚠️ Amazon Polly TTS fallback failed: ${pollyErr.message}. Attempting Cloudflare TTS fallback...`);

      // 3. Fallback 2: Cloudflare Workers AI TTS
      try {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;

        if (!accountId || !apiToken) {
          throw new Error("Missing Cloudflare credentials");
        }

        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/deepgram/aura-1`;
        const cfRes = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            speaker: voiceConfig.cloudflareVoice,
            encoding: "mp3",
          }),
        });

        if (!cfRes.ok) {
          const errText = await cfRes.text();
          throw new Error(`Cloudflare TTS API error (${cfRes.status}): ${errText}`);
        }

        const arrayBuffer = await cfRes.arrayBuffer();
        const audioContent = Buffer.from(arrayBuffer);

        const chunkSize = 1024 * 32;
        for (let i = 0; i < audioContent.length; i += chunkSize) {
          const chunk = audioContent.slice(i, i + chunkSize);
          for (const clientWs of wsClients) {
            if (clientWs.readyState === 1) {
              clientWs.send(chunk);
            }
          }
        }

        synthSuccess = true;
        console.log(`[GD TTS] ✅ Cloudflare TTS fallback broadcast completed for ${agentInfo.name}`);
      } catch (fallbackErr) {
        console.error(`[GD TTS] ❌ All TTS providers (Google, Polly, Cloudflare) failed for ${agentInfo.name}:`, fallbackErr.message);
      }
    }
  }

  // Broadcast completion event to room
  for (const clientWs of wsClients) {
    if (clientWs.readyState === 1) {
      clientWs.send(audioEndPayload);
    }
  }

  return synthSuccess;
}

