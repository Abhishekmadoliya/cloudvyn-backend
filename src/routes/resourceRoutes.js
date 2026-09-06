import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Subscription from "../models/Subscription.js";
import Resource from "../models/resourceModel.js";

const resourceRouter = express.Router();

/**
 * Helper to check if a user has paid resource access.
 */
async function hasPaidResourceAccess(user) {
  if (!user || !user._id) return false;
  if (user.role === "admin" || user.role === "Admin") return true;

  const sub = await Subscription.findOne({ userId: user._id });
  if (!sub) return false;

  const planKey = (sub.planKey || "").toLowerCase();
  const isPaidPlan = planKey === "plus" || planKey === "pro";
  const isCurrentlyActive = sub.paidUntil && new Date(sub.paidUntil) > new Date();

  return isPaidPlan && isCurrentlyActive;
}

/**
 * GET /api/resources
 * Returns resource library items. Free users get a restricted payload with preview stats.
 */
resourceRouter.get("/", requireAuth, async (req, res) => {
  try {
    const isPaid = await hasPaidResourceAccess(req.dbUser);
    const { category, type, search } = req.query;

    if (!isPaid) {
      // Free user: return locked payload with metadata counts and teasers
      const totalCount = await Resource.countDocuments({ isPublished: true });
      const categories = await Resource.distinct("category", { isPublished: true });

      return res.json({
        success: true,
        isPaid: false,
        userPlan: "free",
        totalResources: totalCount,
        categories: categories.length > 0 ? categories : [
          "DSA Cheat Sheets",
          "System Design",
          "Interview Prep Guides",
          "Resume Templates",
          "Behavioral Frameworks",
          "Tech Deep Dives",
        ],
        message: "Full resource library access is exclusive to Plus and Pro subscribers.",
      });
    }

    // Paid user / Admin: query resources
    const query = { isPublished: true };

    if (category && category !== "All") {
      query.category = category;
    }

    if (type && type !== "all") {
      query.resourceType = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const resources = await Resource.find(query)
      .sort({ createdAt: -1 })
      .select("-__v");

    const categories = await Resource.distinct("category", { isPublished: true });

    res.json({
      success: true,
      isPaid: true,
      userPlan: "paid",
      resources,
      categories,
    });
  } catch (error) {
    console.error("GET /api/resources error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch resources" });
  }
});

/**
 * GET /api/resources/:id
 * Get single resource details / full article text.
 */
resourceRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const isPaid = await hasPaidResourceAccess(req.dbUser);
    if (!isPaid) {
      return res.status(403).json({
        success: false,
        isPaid: false,
        message: "Upgrade to Plus or Pro to view full resources.",
      });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource || !resource.isPublished) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    // Increment views count asynchronously
    Resource.findByIdAndUpdate(resource._id, { $inc: { viewsCount: 1 } }).exec();

    res.json({
      success: true,
      resource,
    });
  } catch (error) {
    console.error("GET /api/resources/:id error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch resource details" });
  }
});

export default resourceRouter;
