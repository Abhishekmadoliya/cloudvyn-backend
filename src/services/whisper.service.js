import axios from "axios";
import fs from "fs";
import FormData from "form-data";

/**
 * Transcribes audio using the local Python faster-whisper server.
 * @param {string} filePath Path to the audio file.
 * @returns {Promise<string>} Transcribed text.
 */
export async function transcribeWithWhisper(filePath) {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const response = await axios.post(
      process.env.PYTHON_STT_URL || "http://localhost:8001/transcribe",
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 10000, // 10 second timeout
      }
    );

    return response.data.text || "";
  } catch (error) {
    if (error.response) {
      console.error(`Whisper Python STT Error (Status ${error.response.status}):`, error.response.data);
    } else if (error.request) {
      console.error("Whisper Python STT Error (No Response):", error.message);
    } else {
      console.error("Whisper Python STT Error (Request Setup):", error.message);
    }
    throw error;
  }
}
