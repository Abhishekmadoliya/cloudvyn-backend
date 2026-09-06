import express from "express";
import {
  getAdminRoadmaps,
  getAdminRoadmapStats,
  getAdminRoadmapById,
  createAdminRoadmap,
  updateAdminRoadmap,
  toggleAdminRoadmapStatus,
  deleteAdminRoadmap,
} from "../../controllers/admin/roadmapAdminController.js";

const roadmapAdminRouter = express.Router();

// Admin Roadmap Management Endpoints (Guard enforced upstream in admin/index.js)
roadmapAdminRouter.get("/stats", getAdminRoadmapStats);
roadmapAdminRouter.get("/", getAdminRoadmaps);
roadmapAdminRouter.get("/:id", getAdminRoadmapById);
roadmapAdminRouter.post("/", createAdminRoadmap);
roadmapAdminRouter.put("/:id", updateAdminRoadmap);
roadmapAdminRouter.patch("/:id/status", toggleAdminRoadmapStatus);
roadmapAdminRouter.delete("/:id", deleteAdminRoadmap);

export default roadmapAdminRouter;
