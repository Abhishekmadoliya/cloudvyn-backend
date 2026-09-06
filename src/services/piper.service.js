import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PIPER_DIR = path.join(__dirname, "../tts");
const HIGH_MODEL_PATH = path.join(PIPER_DIR, "piper_models", "en_US-lessac-high.onnx");
const MEDIUM_MODEL_PATH = path.join(PIPER_DIR, "piper_models", "en_US-lessac-medium.onnx");

/**
 * Returns the best available Piper voice model on disk.
 * @returns {string|null}
 */
function getAvailableModelPath() {
  if (fs.existsSync(HIGH_MODEL_PATH) && fs.statSync(HIGH_MODEL_PATH).size > 1024 * 1024) {
    return HIGH_MODEL_PATH;
  }
  if (fs.existsSync(MEDIUM_MODEL_PATH) && fs.statSync(MEDIUM_MODEL_PATH).size > 1024 * 1024) {
    return MEDIUM_MODEL_PATH;
  }
  return null;
}

/**
 * Generates audio using Piper TTS and streams it to the client via stdout.
 * @param {WebSocket} ws WebSocket client
 * @param {string} text Text to synthesize
 * @returns {Promise<void>}
 */
export async function streamAudioWithPiper(ws, text) {
  if (!text) return;

  const modelPath = getAvailableModelPath();
  if (!modelPath) {
    throw new Error("Piper voice model file not found on disk");
  }

  try {
    console.log(`🎙️ Piper Streaming: "${text.substring(0, 30)}..." using ${path.basename(modelPath)}`);
    
    // Signal start with format
    ws.send(JSON.stringify({ type: "audio_start", format: "pcm" }));

    // Execute Piper with stdout as raw PCM output
    const args = [
      "--model", modelPath,
      "--length_scale", "1.05",
      "--output_raw" 
    ];

    const child = spawn("piper", args, { cwd: PIPER_DIR });

    let stderrData = "";
    child.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    // Pipe text to stdin
    child.stdin.write(text);
    child.stdin.end();

    // Capture stdout and send chunks
    child.stdout.on("data", (chunk) => {
      if (ws.readyState === 1) {
        ws.send(chunk);
      }
    });

    // Wait for completion
    await new Promise((resolve, reject) => {
      child.on("close", (code) => {
        if (code === 0) {
          ws.send(JSON.stringify({ type: "audio_end" }));
          console.log("✅ Piper Stream Completed");
          resolve();
        } else {
          console.error(`Piper exited with code ${code}. Stderr: ${stderrData}`);
          reject(new Error(`Piper exited with code ${code}: ${stderrData}`));
        }
      });

      child.on("error", (err) => {
        console.error("Piper process error:", err);
        reject(err);
      });
    });

  } catch (error) {
    console.error("❌ Piper Stream Error:", error.message);
    throw error;
  }
}

/**
 * Initializes a persistent Piper process for a session.
 * @param {WebSocket} ws 
 * @returns {object} Handle with write, flush, and kill methods
 */
export function initPersistentPiper(ws) {
  const modelPath = getAvailableModelPath();
  if (!modelPath) {
    console.warn("⚠️ Piper voice model file (.onnx) not found on disk. Persistent Piper pre-warming skipped.");
    return {
      write: () => {},
      flush: () => {},
      kill: () => {}
    };
  }

  console.log(`🎙️ Pre-warming persistent Piper engine (${path.basename(modelPath)})...`);
  
  const args = [
    "--model", modelPath,
    "--length_scale", "1.0",
    "--output_raw"
  ];

  try {
    const child = spawn("piper", args, { cwd: PIPER_DIR });

    child.stdout.on("data", (chunk) => {
      if (ws.readyState === 1) {
        ws.send(chunk);
      }
    });

    child.stderr.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("Error") && !msg.includes("DEBUG")) {
        console.error(`Piper Engine Error: ${msg}`);
      }
    });

    child.on("error", (err) => {
      console.warn(`Piper Process Startup Warning: ${err.message}`);
    });

    child.on("close", (code) => {
      console.log(`🎙️ Piper engine closed (code ${code})`);
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "audio_end" }));
      }
    });

    return {
      write: (text) => {
        if (child.stdin?.writable) {
          child.stdin.write(text + " ");
        }
      },
      flush: () => {
        if (child.stdin?.writable) {
          child.stdin.write("\n");
        }
      },
      kill: () => {
        try {
          if (child.stdin?.writable) {
            child.stdin.end();
          }
          child.kill();
        } catch (_) {}
      }
    };
  } catch (spawnErr) {
    console.warn("Could not spawn persistent Piper process:", spawnErr.message);
    return {
      write: () => {},
      flush: () => {},
      kill: () => {}
    };
  }
}

// Legacy wrapper
export function startPiperStream(ws) {
  return initPersistentPiper(ws);
}
