import express from "express";
import multer from "multer";
import {
  getCandidateProfile,
  updateCandidateProfile,
  getCandidateStats,
  getCandidatePerformance,
  getHistoryDetail,
  getAchievements,
  getCandidateResume,
  uploadCandidateResume,
  deleteCandidateResume,
  getSavedByokKey,
  saveByokKey,
  deleteByokKey,
} from "../controllers/candidateProfileController.js";
import { verifyFirebaseToken } from "../middleware/requireAuth.js";

export const profileRouter = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// All routes require Firebase authentication
profileRouter.use(verifyFirebaseToken);

// Get candidate profile
profileRouter.get("/profile", getCandidateProfile);

// Update candidate profile
profileRouter.put("/profile", updateCandidateProfile);

// Get candidate statistics
profileRouter.get("/stats", getCandidateStats);

// Get detailed performance metrics
profileRouter.get("/performance", getCandidatePerformance);

// Get specific history detail (mock_test or ai_interview)
profileRouter.get("/history/:type/:id", getHistoryDetail);

// Get achievements
profileRouter.get("/achievements", getAchievements);

// Resume maintenance & Cloudinary storage
profileRouter.get("/resume", getCandidateResume);
profileRouter.post("/resume", upload.single("resume"), uploadCandidateResume);
profileRouter.delete("/resume", deleteCandidateResume);

// Bring Your Own Key (BYOK) for Plus & Pro
profileRouter.get("/byok", getSavedByokKey);
profileRouter.post("/byok", saveByokKey);
profileRouter.delete("/byok", deleteByokKey);

