import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import Groq from "groq-sdk";
import { transcribeWithGoogle } from "../googleSTT.js";
import { transcribeWithWhisper } from "../whisper.service.js";

let _groq = null;
const getGroq = () => {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
};

/**
 * Transcribe candidate audio stream/buffer into text using STT Fallback Chain:
 * Google Cloud STT (Primary) -> Groq Whisper STT (Fallback 1) -> Local Python Whisper (Fallback 2)
 * @param {Buffer} audioBuffer - Binary or base64 decoded audio buffer
 * @param {string} fileExt - Audio file extension (default: 'webm')
 * @returns {Promise<string>} Transcribed text string
 */
export async function transcribeCandidateVoice(audioBuffer, fileExt = "webm") {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error("Empty audio buffer provided for STT");
  }

  const tempDir = os.tmpdir();
  const tempFileName = `gd_voice_${uuidv4()}.${fileExt}`;
  const tempFilePath = path.join(tempDir, tempFileName);

  try {
    fs.writeFileSync(tempFilePath, audioBuffer);
    console.log(`[GD STT] Transcribing candidate voice input (${audioBuffer.length} bytes)...`);

    // 1. Primary STT: Google Cloud Speech-to-Text
    try {
      console.log("[GD STT] 🎙️ Attempting Google Cloud STT (Primary)...");
      const googleTranscript = await transcribeWithGoogle(tempFilePath);
      if (googleTranscript && googleTranscript.trim()) {
        console.log(`[GD STT] ✅ Google STT Success: "${googleTranscript}"`);
        return googleTranscript.trim();
      }
    } catch (googleErr) {
      console.warn(`[GD STT] ⚠️ Google STT failed: ${googleErr.message}. Trying Groq Whisper STT fallback...`);
    }

    // 2. Fallback 1: Groq Whisper STT
    try {
      if (process.env.GROQ_API_KEY) {
        console.log("[GD STT] 🎙️ Attempting Groq Whisper STT (Fallback 1)...");
        const groq = getGroq();
        const whisperRes = await groq.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: "whisper-large-v3",
          language: "en",
          temperature: 0.0,
          response_format: "json",
        });

        if (whisperRes.text && whisperRes.text.trim()) {
          console.log(`[GD STT] ✅ Groq Whisper STT Success: "${whisperRes.text}"`);
          return whisperRes.text.trim();
        }
      }
    } catch (groqErr) {
      console.warn(`[GD STT] ⚠️ Groq Whisper STT failed: ${groqErr.message}. Trying Local Whisper fallback...`);
    }

    // 3. Fallback 2: Local Python Whisper
    try {
      console.log("[GD STT] 🎙️ Attempting Local Python Whisper STT (Fallback 2)...");
      const localTranscript = await transcribeWithWhisper(tempFilePath);
      if (localTranscript && localTranscript.trim()) {
        console.log(`[GD STT] ✅ Local Whisper STT Success: "${localTranscript}"`);
        return localTranscript.trim();
      }
    } catch (whisperErr) {
      console.warn(`[GD STT] ⚠️ Local Whisper STT failed: ${whisperErr.message}`);
    }

    return "";
  } finally {
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanErr) {
        /* ignore */
      }
    }
  }
}
