import express from "express"
import { getAiResponse, streamAiResponse } from "../controllers/chatController.js";

export const chatRouter = express.Router();

// Non-streaming endpoint
chatRouter.post('/', getAiResponse);

// Streaming endpoint
chatRouter.post('/stream', streamAiResponse);
