import { researchService } from '../services/researchService.js';
import { listOllamaModels } from '../utils/llm/ollama.js';

export const uploadSource = async (req, res) => {
  try {
    const { type, sessionId } = req.body;
    const userId = req.user?.id || "guest-user"; // Fallback for guest mode

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const source = await researchService.processSource(req.file, type, sessionId, userId);
    res.status(200).json({ success: true, source });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const chatWithResearch = async (req, res) => {
  try {
    const { prompt, sessionId, model } = req.body;
    const result = await researchService.chat(prompt, sessionId, model);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getModels = async (req, res) => {
  try {
    const models = await listOllamaModels();
    res.status(200).json({ success: true, models });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const studioTask = async (req, res) => {
  try {
    const { task, sessionId } = req.body;
    const result = await researchService.performStudioTask(task, sessionId);
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



