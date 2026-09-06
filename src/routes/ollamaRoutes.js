/**
 * ollamaRoutes.js
 * Routes for Ollama-specific operations like listing available models.
 */
import express from 'express';
import { listOllamaModels } from '../utils/llm/ollama.js';

const ollamaRouter = express.Router();

/**
 * GET /api/ollama/models
 * Returns a list of available Ollama models.
 */
ollamaRouter.get('/models', async (req, res) => {
  try {
    const models = await listOllamaModels();
    res.json({ success: true, data: models });
  } catch (err) {
    console.error('Ollama models route error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default ollamaRouter;
