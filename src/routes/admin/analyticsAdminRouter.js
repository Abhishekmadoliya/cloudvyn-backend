import express from "express";
import mongoose from "mongoose";
import { requireAdminAuth } from "../../middleware/requireAuth.js";
import userModel from "../../models/userModel.js";
import Interview from "../../models/interviewModel.js";
import testAttemptModel from "../../models/testAttemptModel.js";
import MockTest from "../../models/mockTestModel.js";
import Subscription from "../../models/Subscription.js";

const analyticsAdminRouter = express.Router();

analyticsAdminRouter.use(requireAdminAuth);

/**
 * GET /api/admin/analytics
 * Returns comprehensive analytics:
 * 1. User registration histogram & daily trend (14/30 days)
 * 2. Hot AI interview categories, completion rates, difficulty breakdown
 * 3. Daily interview activity timeline
 * 4. Overall platform health metrics
 */
analyticsAdminRouter.get("/", async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 14;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // ── 1. DAILY USER REGISTRATION AGGREGATION ──────────────────────────────
    const userRegAgg = await userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Map into a continuous day array (fill missing dates with 0)
    const userRegMap = {};
    userRegAgg.forEach((item) => {
      userRegMap[item._id] = item.count;
    });

    const dailyUserTrend = [];
    let cumulativeUsers = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = userRegMap[dateStr] || 0;
      cumulativeUsers += count;

      dailyUserTrend.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        users: count,
        cumulative: cumulativeUsers,
      });
    }

    // ── 2. HOT AI INTERVIEW CATEGORIES ───────────────────────────────────────
    const totalInterviewsCount = await Interview.countDocuments({});
    const totalInterviewAttempts = await testAttemptModel.countDocuments({});

    const categoryAgg = await Interview.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $or: [{ $eq: ["$category", null] }, { $eq: ["$category", ""] }] },
              "Technical (DSA)",
              "$category",
            ],
          },
          count: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Calculate percentage share and status for each category
    const hotCategories = categoryAgg.map((item, idx) => {
      const share = totalInterviewsCount > 0 ? Math.round((item.count / totalInterviewsCount) * 100) : 0;
      const completionRate = item.count > 0 ? Math.round((item.completedCount / item.count) * 100) : 0;

      return {
        category: item._id,
        count: item.count,
        sharePercentage: share,
        completionRate,
        rank: idx + 1,
        isHot: idx < 3 || share >= 20,
      };
    });

    // ── 3. DAILY AI INTERVIEWS ACTIVITY TIMELINE ────────────────────────────
    const interviewDailyAgg = await Interview.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const interviewDailyMap = {};
    interviewDailyAgg.forEach((item) => {
      interviewDailyMap[item._id] = item;
    });

    const dailyInterviewTrend = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = interviewDailyMap[dateStr];

      dailyInterviewTrend.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        total: entry?.count || 0,
        completed: entry?.completed || 0,
      });
    }

    // ── 4. DIFFICULTY BREAKDOWN ─────────────────────────────────────────────
    const difficultyAgg = await Interview.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$difficultyLevel", "Medium"] },
          count: { $sum: 1 },
        },
      },
    ]);

    const difficultyBreakdown = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };
    difficultyAgg.forEach((d) => {
      const key = d._id?.charAt(0).toUpperCase() + d._id?.slice(1).toLowerCase();
      if (difficultyBreakdown[key] !== undefined) {
        difficultyBreakdown[key] = d.count;
      } else {
        difficultyBreakdown.Medium += d.count;
      }
    });

    // ── 5. SUMMARY STATS ───────────────────────────────────────────────────
    const totalUsers = await userModel.countDocuments({});
    const totalSubs = await Subscription.countDocuments({});
    const activeSubs = await Subscription.countDocuments({ status: "active" });

    res.json({
      success: true,
      data: {
        timeframeDays: days,
        userAnalytics: {
          totalUsers,
          dailyUserTrend,
          newUsersInTimeframe: userRegAgg.reduce((acc, curr) => acc + curr.count, 0),
        },
        interviewAnalytics: {
          totalInterviews: totalInterviewsCount,
          totalMockAttempts: totalInterviewAttempts,
          hotCategories,
          dailyInterviewTrend,
          difficultyBreakdown,
        },
        systemStats: {
          totalSubscriptions: totalSubs,
          activeSubscriptions: activeSubs,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch analytics" });
  }
});

export default analyticsAdminRouter;
