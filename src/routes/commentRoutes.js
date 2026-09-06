/**
 * commentRoutes.js
 *
 *   GET    /api/comment/:postId           — list top-level comments
 *   GET    /api/comment/replies/:id       — replies to a comment
 *   POST   /api/comment                  — add comment (auth)
 *   DELETE /api/comment/:id              — delete own comment (auth)
 */
import express from 'express';
import {
  getComments,
  getReplies,
  addComment,
  deleteComment,
} from '../controllers/commentController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const commentRouter = express.Router();

commentRouter.get('/:postId', getComments);
commentRouter.get('/replies/:parentCommentId', getReplies);
commentRouter.post('/', requireAuth, addComment);
commentRouter.delete('/:id', requireAuth, deleteComment);

export default commentRouter;
