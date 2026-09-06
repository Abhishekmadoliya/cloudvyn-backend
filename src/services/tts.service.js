// Google TTS uses native fetch (Node 18+)

/**
 * Streams audio content from Google Cloud TTS to a WebSocket client.
 * Supports English (en-US) and Hindi (hi-IN) voices.
 */
export async function streamAudioToClient(ws, text, language = "en") {
  if (!text) return;
  
  try {
    const isHindi = language === "hi" || language === "hi-IN";
    console.log(`🎙️ Starting Google Cloud TTS via REST API (Language: ${isHindi ? "Hindi (hi-IN)" : "English (en-US)"})...`);
    
    ws.send(JSON.stringify({ type: "audio_start", format: "mp3" }));

    const API_KEY = process.env.GOOGLE_TTS_API_KEY;
    const voiceConfig = isHindi
      ? { languageCode: "hi-IN", name: "hi-IN-Neural2-A" }
      : { languageCode: "en-US", name: "en-US-Studio-O" };

    const rate = isHindi ? "1.05" : "1.15";

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            ssml: `<speak><prosody rate="${rate}">${text}</prosody></speak>`
          },
          voice: voiceConfig,
          audioConfig: {
            audioEncoding: "MP3",
          },
        })
      }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google TTS API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const audioContent = Buffer.from(data.audioContent, "base64");

    // Send audio in chunks to simulate streaming for the frontend
    const chunkSize = 1024 * 32; // 32KB chunks
    for (let i = 0; i < audioContent.length; i += chunkSize) {
      const chunk = audioContent.slice(i, i + chunkSize);
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(chunk);
      }
    }

    ws.send(JSON.stringify({ type: "audio_end" }));
    console.log("✅ Google TTS delivery completed");
  } catch (error) {
    console.error("❌ Google TTS error:", error.message);
    throw error;
  }
}
