/**
 * reactionRoutes.js
 *
 *   POST /api/reaction                     — toggle reaction (auth)
 *   GET  /api/reaction/post/:postId        — get user's reactions (auth)
 */
import express from 'express';
import { toggleReaction, getUserReactions } from '../controllers/reactionController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const reactionRouter = express.Router();

reactionRouter.post('/', requireAuth, toggleReaction);
reactionRouter.get('/post/:postId', requireAuth, getUserReactions);

export default reactionRouter;
