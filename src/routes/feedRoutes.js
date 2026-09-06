/**
 * feedRoutes.js
 * Public and auth-optional routes for the AI Feed.
 *
 *   GET /api/feed               — ranked + personalized feed
 *   GET /api/feed/post/:id      — single post detail (logs view)
 *   GET /api/feed/post/:id/debate   — debate thread
 *   GET /api/feed/post/:id/explain  — ELI15 explanation
 */
import express from 'express';
import admin from '../firebase/firebaseAdmin.js';
import {
  getFeed,
  getPost,
  getDebate,
  explainPost,
  getAllPostSlugs,
} from '../controllers/feedPostController.js';
import userModel from '../models/userModel.js';

const feedRouter = express.Router();

/**
 * Optional auth middleware — attaches req.dbUser if a valid Firebase token
 * is present, but does NOT block anonymous requests.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.split(' ')[1]);
    req.user = decoded;
    const dbUser = await userModel.findOne({ firebaseUid: decoded.uid }).lean();
    if (dbUser) req.dbUser = dbUser;
  } catch {
    // Ignore invalid/expired token — serve as anonymous
  }
  next();
};

feedRouter.get('/', optionalAuth, getFeed);
feedRouter.get('/post/:id', optionalAuth, getPost);
feedRouter.get('/post/:id/debate', getDebate);
feedRouter.get('/post/:id/explain', explainPost);
feedRouter.get('/all-post-slugs', getAllPostSlugs);

export default feedRouter;
