import express from "express";
import {
  seedTopics,
  getTopics,
  createSession,
  getSessionById,
  getUserSessions,
  generateReport,
} from "../controllers/gd/gdController.js";

const groupDiscussionRouter = express.Router();

// Topic Management
groupDiscussionRouter.post("/topics/seed", seedTopics);
groupDiscussionRouter.get("/topics", getTopics);

// Session Management
groupDiscussionRouter.post("/sessions", createSession);
groupDiscussionRouter.get("/sessions/user/:userId", getUserSessions);
groupDiscussionRouter.get("/sessions/:sessionId", getSessionById);
groupDiscussionRouter.post("/sessions/:sessionId/report", generateReport);

export default groupDiscussionRouter;
