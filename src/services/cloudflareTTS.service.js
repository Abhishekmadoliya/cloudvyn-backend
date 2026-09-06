/**
 * Streams audio content from Cloudflare Workers AI (Deepgram Aura-1) TTS to a WebSocket client.
 */
export async function streamAudioWithCloudflare(ws, text, voice = 'asteria') {
  if (!text) return;

  try {
    console.log(`🎙️ Starting Cloudflare TTS (Voice: ${voice})...`);

    ws.send(JSON.stringify({ type: "audio_start", format: "mp3" }));

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/deepgram/aura-1`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        speaker: voice,
        encoding: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Cloudflare TTS API error: ${response.status} ${errorData}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('audio')) {
      const data = await response.json();
      throw new Error(`Cloudflare TTS returned non-audio response: ${JSON.stringify(data)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioContent = Buffer.from(arrayBuffer);

    // Send audio in chunks to simulate streaming for the frontend
    const chunkSize = 1024 * 32; // 32KB chunks
    for (let i = 0; i < audioContent.length; i += chunkSize) {
      const chunk = audioContent.slice(i, i + chunkSize);
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(chunk);
      }
    }

    ws.send(JSON.stringify({ type: "audio_end" }));
    console.log("✅ Cloudflare TTS delivery completed");
  } catch (error) {
    console.error("❌ Cloudflare TTS error:", error.message);
    throw error;
  }
}
