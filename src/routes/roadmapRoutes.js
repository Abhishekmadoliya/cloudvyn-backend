import express from "express";
import {
  getAllRoadmaps,
  getRoadmapBySlug,
  getRoadmapSlugs,
} from "../controllers/roadmapController.js";

const roadmapRouter = express.Router();

// Public Roadmap Endpoints
roadmapRouter.get("/slugs", getRoadmapSlugs);
roadmapRouter.get("/", getAllRoadmaps);
roadmapRouter.get("/:slug", getRoadmapBySlug);

export default roadmapRouter;
