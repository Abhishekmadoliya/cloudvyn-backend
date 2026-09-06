import express from "express";
import {
  triggerPipeline,
  approvePost,
  rejectPost,
  getPipelineStatus,
  getKeywordQueue,
  addKeywords,
  getPostWithJob,
  resumePipeline,
} from "../../controllers/blog/blogAutomationController.js";

/**
 * Blog Automation Routes
 *
 * Mount at: /api/blog
 *
 * Endpoints:
 *   POST /api/blog/trigger       — Start pipeline for next queued keyword
 *   POST /api/blog/approve/:id   — Approve a pending_review post → SEO → Publish
 *   POST /api/blog/reject/:id    — Reject post → regenerate content
 *   GET  /api/blog/status        — Dashboard: all posts + pipeline state
 *   GET  /api/blog/queue         — Keyword queue viewer
 *   POST /api/blog/keywords      — Add keywords to the queue
 *   GET  /api/blog/post/:id      — Get single post with job + analytics data
 *   POST /api/blog/resume/:id    — Resume a failed pipeline from last stage
 */

const blogAutomationRouter = express.Router();

// ── Pipeline control ──────────────────────────────────────────────────────────
blogAutomationRouter.post("/trigger", triggerPipeline);
blogAutomationRouter.post("/approve/:id", approvePost);
blogAutomationRouter.post("/reject/:id", rejectPost);
blogAutomationRouter.post("/resume/:id", resumePipeline);

// ── Dashboard & monitoring ────────────────────────────────────────────────────
blogAutomationRouter.get("/status", getPipelineStatus);
blogAutomationRouter.get("/queue", getKeywordQueue);
blogAutomationRouter.get("/post/:id", getPostWithJob);

// ── Keyword management ────────────────────────────────────────────────────────
blogAutomationRouter.post("/keywords", addKeywords);

export default blogAutomationRouter;
