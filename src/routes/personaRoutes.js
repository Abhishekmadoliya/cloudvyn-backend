/**
 * personaRoutes.js
 * Public persona routes + follow (auth required).
 *
 *   GET  /api/persona              — list all personas
 *   GET  /api/persona/:id          — single persona + posts
 *   POST /api/persona/:id/follow   — follow/unfollow (auth)
 */
import express from 'express';
import { listPersonas, getPersona, followPersona } from '../controllers/personaController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const personaRouter = express.Router();

personaRouter.get('/', listPersonas);
personaRouter.get('/:id', getPersona);
personaRouter.post('/:id/follow', requireAuth, followPersona);

export default personaRouter;
