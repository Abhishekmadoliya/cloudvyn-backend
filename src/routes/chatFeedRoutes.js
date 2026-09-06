/**
 * chatFeedRoutes.js
 * Routes for AI Persona chat features.
 */
import express from 'express';
import { streamPersonaChat } from '../controllers/chatFeedController.js';

const chatFeedRouter = express.Router();

/**
 * POST /api/feed/chat/stream
 * Handles streaming response from AI persona.
 */
chatFeedRouter.post('/stream', streamPersonaChat);

export default chatFeedRouter;
