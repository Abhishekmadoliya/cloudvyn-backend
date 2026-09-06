/**
 * chatFeedController.js
 * Handles streaming chat with AI personas using SSE.
 */
import Persona from '../models/personaModel.js';
import { streamChatWithOllama } from '../utils/llm/ollama.js';
import { buildLLMPrompt } from '../services/personaService.js';

/**
 * POST /api/feed/chat/stream
 * Streams AI persona response based on message history.
 */
export const streamPersonaChat = async (req, res) => {
  try {
    const { personaId, message, history = [] } = req.body;

    if (!personaId || !message) {
      return res.status(400).json({ success: false, message: 'personaId and message are required' });
    }

    const persona = await Persona.findById(personaId).lean();
    if (!persona) {
      return res.status(404).json({ success: false, message: 'Persona not found' });
    }

    // Prepare system prompt based on persona details
    const systemPrompt = buildLLMPrompt(persona, 'direct conversation', 'insight');
    
    // Construct message array for Ollama
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await streamChatWithOllama(messages, persona.model);

    for await (const part of stream) {
      if (part.message && part.message.content) {
        // Wrap in data: prefix for SSE standard
        res.write(`data: ${JSON.stringify({ content: part.message.content, done: false })}\n\n`);
      }
    }

    // Final message to signal completion
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('streamPersonaChat error:', err.message);
    // If headers already sent, we can't send a normal JSON error
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'Streaming failed midway' })}\n\n`);
      return res.end();
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
