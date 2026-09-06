/**
 * feedAdminRoutes.js
 * All routes require Firebase token + admin role via requireAuth + requireAdmin.
 *
 * Personas:
 *   POST   /api/admin/feed/persona          — create
 *   PUT    /api/admin/feed/persona/:id      — update
 *   DELETE /api/admin/feed/persona/:id      — delete
 *
 * Posts:
 *   GET    /api/admin/feed/post/all          — list all (any status)
 *   POST   /api/admin/feed/post             — manually create
 *   POST   /api/admin/feed/post/generate    — LLM-generate post
 *   PUT    /api/admin/feed/post/:id         — edit post
 *   PATCH  /api/admin/feed/post/:id/status  — set status (publish/flag/draft)
 *   DELETE /api/admin/feed/post/:id         — delete
 *
 * Topics:
 *   POST   /api/admin/feed/topic            — create
 *   PUT    /api/admin/feed/topic/:id        — update
 *   DELETE /api/admin/feed/topic/:id        — delete
 *
 * Sources:
 *   POST   /api/admin/feed/source           — create
 *   PUT    /api/admin/feed/source/:id       — update
 *   DELETE /api/admin/feed/source/:id       — delete
 */
import express from 'express';
import { requireAuth, requireAdmin } from '../../middleware/requireAuth.js';

import {
  createPersona,
  updatePersona,
  deletePersona,
} from '../../controllers/personaController.js';

import {
  adminListPosts,
  adminCreatePost,
  adminGeneratePost,
  adminUpdatePost,
  adminSetPostStatus,
  adminDeletePost,
} from '../../controllers/feedPostController.js';

import {
  createTopic,
  updateTopic,
  deleteTopic,
} from '../../controllers/topicController.js';

import {
  createSource,
  updateSource,
  deleteSource,
} from '../../controllers/sourceController.js';

const feedAdminRouter = express.Router();

// Apply auth + admin guard to all routes
feedAdminRouter.use(requireAuth, requireAdmin);

// ── Personas ──────────────────────────────────────────────────────────────────
feedAdminRouter.post('/persona', createPersona);
feedAdminRouter.put('/persona/:id', updatePersona);
feedAdminRouter.delete('/persona/:id', deletePersona);

// ── Posts ─────────────────────────────────────────────────────────────────────
feedAdminRouter.get('/post/all', adminListPosts);
feedAdminRouter.post('/post', adminCreatePost);
feedAdminRouter.post('/post/generate', adminGeneratePost);
feedAdminRouter.put('/post/:id', adminUpdatePost);
feedAdminRouter.patch('/post/:id/status', adminSetPostStatus);
feedAdminRouter.delete('/post/:id', adminDeletePost);

// ── Topics ────────────────────────────────────────────────────────────────────
feedAdminRouter.post('/topic', createTopic);
feedAdminRouter.put('/topic/:id', updateTopic);
feedAdminRouter.delete('/topic/:id', deleteTopic);

// ── Sources ───────────────────────────────────────────────────────────────────
feedAdminRouter.post('/source', createSource);
feedAdminRouter.put('/source/:id', updateSource);
feedAdminRouter.delete('/source/:id', deleteSource);

export default feedAdminRouter;
