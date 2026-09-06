import express from "express";
import { verifyFirebaseToken } from "../../middleware/requireAuth.js";
import {
    createInterviewConfig,
    deleteInterviewConfig,
    getAllInterviewConfigs,
    getInterviewConfigById,
    updateInterviewConfig
} from "../../controllers/recruiter/interviewConfigController.js";

const router = express.Router();

// All routes require recruiter authentication (verifyFirebaseToken provides req.user)
router.post("/", verifyFirebaseToken, createInterviewConfig);
router.get("/", verifyFirebaseToken, getAllInterviewConfigs);
router.get("/:id", verifyFirebaseToken, getInterviewConfigById);
router.put("/:id", verifyFirebaseToken, updateInterviewConfig);
router.delete("/:id", verifyFirebaseToken, deleteInterviewConfig);

export default router;
