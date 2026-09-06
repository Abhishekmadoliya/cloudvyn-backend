import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

/**
 * Amazon Polly Text-to-Speech (TTS) Service
 * 
 * Provides enterprise-grade speech synthesis with:
 * - Neural voice engine support
 * - English (US/Global), Hindi (hi-IN), and Indian English (en-IN) voices
 * - WebSocket audio streaming in 32KB chunks
 * - Graceful error handling and credential validation
 */

// Voice configuration map by language and persona archetype
export const POLLY_VOICES = {
  // Language defaults
  en: {
    voiceId: "Matthew", // Male Neural
    engine: "neural",
    languageCode: "en-US",
    rate: "110%", // Conversational pace
  },
  "en-US": {
    voiceId: "Matthew",
    engine: "neural",
    languageCode: "en-US",
    rate: "110%",
  },
  "en-IN": {
    voiceId: "Kajal", // Indian English / Bilingual Neural
    engine: "neural",
    languageCode: "en-IN",
    rate: "105%",
  },
  hi: {
    voiceId: "Kajal", // Hindi Neural
    engine: "neural",
    languageCode: "hi-IN",
    rate: "105%",
  },
  "hi-IN": {
    voiceId: "Kajal",
    engine: "neural",
    languageCode: "hi-IN",
    rate: "105%",
  },

  // Alternative curated voices
  female_en: {
    voiceId: "Joanna", // Female Neural
    engine: "neural",
    languageCode: "en-US",
    rate: "110%",
  },
  analytical_en: {
    voiceId: "Danielle", // Crisp Analytical Female Neural
    engine: "neural",
    languageCode: "en-US",
    rate: "108%",
  },
  warm_en: {
    voiceId: "Ruth", // Warm Female Neural
    engine: "neural",
    languageCode: "en-US",
    rate: "105%",
  },
  standard_hi: {
    voiceId: "Aditi", // Bilingual Hindi/English Standard
    engine: "standard",
    languageCode: "hi-IN",
    rate: "105%",
  },

  // Persona archetypes for Group Discussions & Multi-agent interviews
  dominant: {
    voiceId: "Matthew",
    engine: "neural",
    languageCode: "en-US",
    rate: "110%",
  },
  analytical: {
    voiceId: "Danielle",
    engine: "neural",
    languageCode: "en-US",
    rate: "108%",
  },
  consensus_builder: {
    voiceId: "Kajal",
    engine: "neural",
    languageCode: "en-IN",
    rate: "105%",
  },
};

let _pollyClient = null;

/**
 * Returns a cached PollyClient instance or initializes one from environment variables.
 */
export function getPollyClient() {
  if (_pollyClient) return _pollyClient;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_POLLY_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_POLLY_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || process.env.AWS_POLLY_REGION || "us-east-1";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS credentials: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not configured.");
  }

  _pollyClient = new PollyClient({
    region,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    },
  });

  return _pollyClient;
}

/**
 * Checks whether Amazon Polly credentials are configured in the environment.
 */
export function isPollyConfigured() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_POLLY_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_POLLY_SECRET_ACCESS_KEY;
  return Boolean(accessKeyId && secretAccessKey);
}

/**
 * Sanitizes plain text into valid SSML content.
 */
function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Resolves the appropriate voice configuration based on language or archetype options.
 */
export function resolvePollyVoice(options = {}) {
  const { language = "en", voiceId, engine, archetype, gender } = options;

  if (voiceId) {
    return {
      voiceId,
      engine: engine || "neural",
      languageCode: language.startsWith("hi") ? "hi-IN" : "en-US",
      rate: "110%",
    };
  }

  if (archetype && POLLY_VOICES[archetype]) {
    return POLLY_VOICES[archetype];
  }

  if (gender === "female" && (language === "en" || language === "en-US")) {
    return POLLY_VOICES.female_en;
  }

  const normalizedLang = language.toLowerCase();
  return POLLY_VOICES[normalizedLang] || POLLY_VOICES.en;
}

/**
 * Synthesizes speech from text using Amazon Polly.
 * Returns an MP3 Audio Buffer.
 * 
 * @param {string} text - Text to synthesize
 * @param {object} options - Options { language, voiceId, engine, rate, archetype, useSsml }
 * @returns {Promise<Buffer>} Audio buffer in MP3 format
 */
export async function synthesizeSpeechWithPolly(text, options = {}) {
  if (!text || !text.trim()) {
    throw new Error("Text is required for Amazon Polly synthesis.");
  }

  const client = getPollyClient();
  const voiceConfig = resolvePollyVoice(options);
  const voiceId = options.voiceId || voiceConfig.voiceId;
  const engine = options.engine || voiceConfig.engine || "neural";
  const rate = options.rate || voiceConfig.rate || "110%";
  const useSsml = options.useSsml !== false;

  let pollyText = text.trim();
  let textType = "text";

  if (useSsml) {
    textType = "ssml";
    pollyText = `<speak><prosody rate="${rate}">${escapeXml(pollyText)}</prosody></speak>`;
  }

  const params = {
    OutputFormat: "mp3",
    Text: pollyText,
    TextType: textType,
    VoiceId: voiceId,
    Engine: engine,
  };

  try {
    const command = new SynthesizeSpeechCommand(params);
    const response = await client.send(command);

    if (!response.AudioStream) {
      throw new Error("Amazon Polly returned empty AudioStream");
    }

    // Convert SDK stream to Buffer
    if (typeof response.AudioStream.transformToByteArray === "function") {
      const byteArray = await response.AudioStream.transformToByteArray();
      return Buffer.from(byteArray);
    } else {
      const chunks = [];
      for await (const chunk of response.AudioStream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
  } catch (err) {
    // If neural engine fails for a specific voice/region, attempt standard fallback
    if (engine === "neural" && err.name === "EngineNotSupportedException") {
      console.warn(`[Amazon Polly] ⚠️ Neural engine unsupported for voice ${voiceId}. Retrying with standard engine...`);
      return synthesizeSpeechWithPolly(text, { ...options, engine: "standard" });
    }
    throw err;
  }
}

/**
 * Streams audio content from Amazon Polly to a WebSocket client in 32KB chunks.
 * Protocol:
 *  1. Sends JSON: { type: "audio_start", format: "mp3", provider: "amazon_polly" }
 *  2. Sends binary MP3 chunks (32KB each)
 *  3. Sends JSON: { type: "audio_end" }
 * 
 * @param {WebSocket} ws - Active WebSocket connection
 * @param {string} text - Spoken text
 * @param {string|object} langOrOptions - Language code or config options
 */
export async function streamAudioWithPolly(ws, text, langOrOptions = "en") {
  if (!text || !text.trim()) return;
  if (!ws || ws.readyState !== 1) { // 1 = WebSocket.OPEN
    console.warn("[Amazon Polly] Cannot stream audio: WebSocket is not open.");
    return;
  }

  const options = typeof langOrOptions === "string" ? { language: langOrOptions } : (langOrOptions || {});
  const voiceConfig = resolvePollyVoice(options);

  try {
    console.log(`🎙️ Starting Amazon Polly TTS (Voice: ${voiceConfig.voiceId}, Engine: ${voiceConfig.engine}, Lang: ${voiceConfig.languageCode})...`);

    // 1. Notify frontend that audio stream has begun
    ws.send(JSON.stringify({ type: "audio_start", format: "mp3", provider: "amazon_polly" }));

    // 2. Synthesize audio buffer
    const audioBuffer = await synthesizeSpeechWithPolly(text, options);

    // 3. Stream in 32KB chunks
    const chunkSize = 1024 * 32; // 32KB chunks
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      if (ws.readyState === 1) {
        ws.send(chunk);
      }
    }

    // 4. Notify frontend that audio stream has finished
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: "audio_end" }));
    }
    console.log("✅ Amazon Polly TTS delivery completed");
  } catch (error) {
    console.error("❌ Amazon Polly TTS error:", error.message);
    throw error;
  }
}

/**
 * Broadcasts Amazon Polly synthesized speech to multiple WebSocket clients in a GD room.
 * 
 * @param {Set<WebSocket>} wsClients - Set of client WebSockets in the room
 * @param {string} text - Utterance text
 * @param {object} agentInfo - { archetype, name, agentInstanceId }
 */
export async function streamPollyGdAgentAudio(wsClients, text, agentInfo = {}) {
  if (!text || !wsClients || wsClients.size === 0) return false;

  const archetype = agentInfo.archetype || "dominant";
  const voiceConfig = POLLY_VOICES[archetype] || POLLY_VOICES.dominant;

  const audioStartPayload = JSON.stringify({
    type: "gd_audio_start",
    payload: {
      agentInstanceId: agentInfo.agentInstanceId || "agent_1",
      speakerName: agentInfo.name || "AI Agent",
      archetype,
      format: "mp3",
      provider: "amazon_polly",
    },
  });

  const audioEndPayload = JSON.stringify({
    type: "gd_audio_end",
    payload: {
      agentInstanceId: agentInfo.agentInstanceId || "agent_1",
      speakerName: agentInfo.name || "AI Agent",
    },
  });

  // Notify all room clients
  for (const clientWs of wsClients) {
    if (clientWs.readyState === 1) {
      clientWs.send(audioStartPayload);
    }
  }

  try {
    console.log(`[GD TTS] 🎙️ Synthesizing Amazon Polly TTS for ${agentInfo.name || "Agent"} (Voice: ${voiceConfig.voiceId})...`);
    const audioBuffer = await synthesizeSpeechWithPolly(text, { archetype });

    const chunkSize = 1024 * 32;
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      for (const clientWs of wsClients) {
        if (clientWs.readyState === 1) {
          clientWs.send(chunk);
        }
      }
    }

    console.log(`[GD TTS] ✅ Amazon Polly broadcast completed for ${agentInfo.name}`);
    return true;
  } catch (err) {
    console.error(`[GD TTS] ❌ Amazon Polly GD streaming error for ${agentInfo.name}:`, err.message);
    throw err;
  } finally {
    for (const clientWs of wsClients) {
      if (clientWs.readyState === 1) {
        clientWs.send(audioEndPayload);
      }
    }
  }
}
