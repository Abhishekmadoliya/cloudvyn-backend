import express from "express";
import {
  createMockTest,
  getAllMockTests,
  getMockTestById,
  updateMockTest,
  publishMockTest,
  deleteMockTest,
  getAllMockTestCategory,
  getTestByCategory,
} from "../controllers/mockTestController.js";

import {
  addQuestion,
  getQuestionsForTest,
  getQuestionPublic,
  updateQuestion,
  deleteQuestion,
  bulkAddQuestions,
} from "../controllers/mcqQuestionController.js";

import {
  startTestAttempt,
  saveAnswer,
  submitTestAttempt,
  getAttemptDetails,
  getUserTestAttempts,
} from "../controllers/testAttemptController.js";

import {
  getResultById,
  getUserTestResults,
  getAllUserResults,
  getTestLeaderboard,
  getUserAnalytics,
} from "../controllers/testResultController.js";
import { verifyFirebaseToken } from "../middleware/requireAuth.js";

const mockTestRouter = express.Router();

// ========== TEST ROUTES (Admin/Create) ==========
mockTestRouter.post("/tests", verifyFirebaseToken, createMockTest); // Create test
mockTestRouter.get("/tests", getAllMockTests); // Get all tests with filters
mockTestRouter.get("/tests/:id", getMockTestById); // Get single test
mockTestRouter.put("/tests/:id", verifyFirebaseToken, updateMockTest); // Update test
mockTestRouter.patch("/tests/:id/publish", verifyFirebaseToken, publishMockTest); // Publish/Unpublish test
mockTestRouter.delete("/tests/:id", verifyFirebaseToken, deleteMockTest); // Delete test

// ========== CATEGORY ROUTES ==========
mockTestRouter.get("/categories", getAllMockTestCategory); // Get all categories
mockTestRouter.get("/categories/:slug/tests", getTestByCategory); // Get tests by category

// ========== QUESTION ROUTES (Admin) ==========
mockTestRouter.post("/questions", addQuestion); // Add single question
mockTestRouter.post("/questions/bulk/add", bulkAddQuestions); // Bulk add questions
mockTestRouter.get("/questions/:testId", getQuestionsForTest); // Get all questions for a test
mockTestRouter.get("/questions/:id/public", getQuestionPublic); // Get single question (public)
mockTestRouter.put("/questions/:id", updateQuestion); // Update question
mockTestRouter.delete("/questions/:id", deleteQuestion); // Delete question

// ========== TEST ATTEMPT ROUTES (User) ==========
mockTestRouter.post("/attempts/start", verifyFirebaseToken, startTestAttempt); // Start new attempt
mockTestRouter.post("/attempts/:attemptId/save-answer", verifyFirebaseToken, saveAnswer); // Save answer while in progress
mockTestRouter.post("/attempts/:attemptId/submit", verifyFirebaseToken, submitTestAttempt); // Submit test
mockTestRouter.get("/attempts/:attemptId", verifyFirebaseToken, getAttemptDetails); // Get attempt details with answers
mockTestRouter.get("/attempts/test/:testId", verifyFirebaseToken, getUserTestAttempts); // Get user's attempts for a test

// ========== RESULT ROUTES ==========
mockTestRouter.get("/results/:resultId", verifyFirebaseToken, getResultById); // Get result details
mockTestRouter.get("/results/test/:testId", verifyFirebaseToken, getUserTestResults); // Get user's results for a test
mockTestRouter.get("/results/user/all", verifyFirebaseToken, getAllUserResults); // Get all user's results
mockTestRouter.get("/leaderboard/:testId", getTestLeaderboard); // Get test leaderboard (public)
mockTestRouter.get("/analytics/user", verifyFirebaseToken, getUserAnalytics); // Get user analytics

export default mockTestRouter;
