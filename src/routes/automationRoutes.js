import express from 'express';
import { getAutomations, getAutomationBySlug, getAllSlugs } from '../controllers/automationController.js';

const automationRouter = express.Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

// GET /api/automations/all  — list published automations (optional ?category / ?useCase)
automationRouter.get("/all", getAutomations);

// GET /api/automations/get/:slug  — single published automation by slug
automationRouter.get("/get/:slug", getAutomationBySlug);

// Convenience filter routes (SEO-friendly URLs forwarded to getAutomations)
automationRouter.get("/category/:category", (req, res) => {
    req.query.category = req.params.category;
    return getAutomations(req, res);
});

automationRouter.get("/use-case/:useCase", (req, res) => {
    req.query.useCase = req.params.useCase;
    return getAutomations(req, res);
});


// get all slugs for sitemap
automationRouter.get("/all-slugs", getAllSlugs);

export default automationRouter;
