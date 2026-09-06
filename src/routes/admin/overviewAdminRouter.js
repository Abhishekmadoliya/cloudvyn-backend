import express from "express";
import mongoose from "mongoose";
import { requireAdminAuth } from "../../middleware/requireAuth.js";
import userModel from "../../models/userModel.js";
import blogModel from "../../models/blogModel.js";
import MockTest from "../../models/mockTestModel.js";
import Subscription from "../../models/Subscription.js";
import Interview from "../../models/interviewModel.js";
import testAttemptModel from "../../models/testAttemptModel.js";
import feedPostModel from "../../models/feedPostModel.js";

const overviewAdminRouter = express.Router();

// Enforce admin authentication
overviewAdminRouter.use(requireAdminAuth);

/**
 * GET /api/admin/overview/stats
 * Aggregated dashboard statistics for console panel
 */
overviewAdminRouter.get("/stats", async (req, res) => {
  try {
    const totalUsers = await userModel.countDocuments({});
    const adminUsers = await userModel.countDocuments({ role: { $in: ["admin", "Admin"] } });
    const activeUsers = await userModel.countDocuments({ isActive: "true" });

    const blogCount = await blogModel.countDocuments({});
    const feedCount = await feedPostModel.countDocuments({});
    const totalBlogs = blogCount + feedCount;

    const totalMockTests = await MockTest.countDocuments({});
    const totalSubscriptions = await Subscription.countDocuments({});
    const activeSubscriptions = await Subscription.countDocuments({ status: "active" });

    // Aggregate interviews from Interview collection + TestAttempt collection + user interviewCount
    const interviewDocsCount = await Interview.countDocuments({});
    const testAttemptsCount = await testAttemptModel.countDocuments({});
    const userInterviewAggregate = await userModel.aggregate([
      { $group: { _id: null, totalInterviews: { $sum: "$interviewCount" } } }
    ]);
    const userInterviewsSum = userInterviewAggregate[0]?.totalInterviews || 0;

    const totalInterviews = Math.max(interviewDocsCount + testAttemptsCount, userInterviewsSum);

    // Platform Uptime / DB Health
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? "Connected" : dbState === 2 ? "Connecting" : "Disconnected";

    const recentUsers = await userModel.find({})
      .select("username email role createdAt profileImage")
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      message: "Fetched overview stats successfully",
      data: {
        stats: {
          totalUsers,
          adminUsers,
          activeUsers,
          totalInterviews,
          totalBlogs,
          totalMockTests,
          totalSubscriptions,
          activeSubscriptions,
        },
        health: {
          status: "Healthy",
          dbStatus,
          uptime: process.uptime(),
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
        },
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/overview/stats:", error);
    return res.status(500).json({ success: false, message: "Server error fetching overview stats" });
  }
});

export default overviewAdminRouter;
