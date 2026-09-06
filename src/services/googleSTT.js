import fs from 'fs';

/**
 * Transcribes audio using Google Cloud Speech-to-Text REST API
 * @param {string} filename - Path to the audio file
 * @param {string} languageCode - Target language code (e.g. "en-US" or "hi-IN")
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeWithGoogle(filename, languageCode = "en-US") {
  try {
    console.log(`🔄 Attempting fallback to Google Cloud STT (Language: ${languageCode})...`);
    
    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(filename);
    const audioContent = fileBuffer.toString('base64');
    
    const API_KEY = process.env.GOOGLE_TTS_API_KEY; // Reusing the key as requested/assumed
    
    if (!API_KEY) {
      throw new Error("Google API Key not found for fallback");
    }

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS", // Assuming input is WebM/Opus from frontend MediaRecorder
            sampleRateHertz: 48000, // Standard for WebM
            languageCode: languageCode,
            enableAutomaticPunctuation: true,
            model: "default"
          },
          audio: {
            content: audioContent
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google STT API error: ${JSON.stringify(errorData.error)}`);
    }

    const data = await response.json();
    
    // Extract transcript from results
    if (data.results && data.results.length > 0) {
      const transcript = data.results
        .map(result => result.alternatives[0].transcript)
        .join(" ");
      console.log("✅ Google STT Success:", transcript.substring(0, 50) + "...");
      return transcript;
    } else {
      console.log("⚠️ Google STT returned no results");
      return "";
    }

  } catch (error) {
    console.error("❌ Google STT Fallback Failed:", error.message);
    throw error; // Propagate to caller
  }
}
