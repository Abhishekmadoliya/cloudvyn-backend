import TestResult from "../models/testResultModel.js";
import MockTest from "../models/mockTestModel.js";
import TestAttempt from "../models/testAttemptModel.js";
import User from "../models/userModel.js";
import { ObjectId } from "mongodb";

/**
 * Get user's result for a specific attempt
 * GET /api/results/:resultId
 */
export const getResultById = async (req, res) => {
  try {
    const { resultId } = req.params;
    const firebaseUid = req.user?.uid;

    // Get user from Firebase UID
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userDbId = user._id;

    const result = await TestResult.findById(resultId)
      .populate("testId", "title category difficulty")
      .populate("userId", "username email");

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    // Verify user owns this result
    if (result.userId._id.toString() !== userDbId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Also fetch the attempt with populated answers and questions
    const attempt = await TestAttempt.findById(result.attemptId)
      .populate({
        path: "answers.questionId",
        select: "text question questionText options correctAnswer marks difficulty",
      });

    // Add answers to result for frontend review
    const resultData = {
      ...result.toObject(),
      answers: attempt?.answers || [],
    };

    return res.status(200).json({
      success: true,
      message: "Result fetched successfully",
      data: resultData,
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching result",
      error: error.message,
    });
  }
};

/**
 * Get all results for a user for a specific test
 * GET /api/results/test/:testId
 */
export const getUserTestResults = async (req, res) => {
  try {
    const { testId } = req.params;
    const firebaseUid = req.user?.uid;
    const { page = 1, limit = 10 } = req.query;

    // Get user from Firebase UID
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userDbId = user._id;

    const results = await TestResult.find({ userId: userDbId, testId })
      .select("percentage marksObtained totalMarks isPassed submittedAt evaluatedAt")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ submittedAt: -1 });

    const total = await TestResult.countDocuments({ userId: userDbId, testId });

    // Calculate stats
    const allResults = await TestResult.find({ userId: userDbId, testId });
    const stats = {
      totalAttempts: allResults.length,
      bestScore: Math.max(...allResults.map((r) => r.percentage), 0),
      averageScore: Math.round((allResults.reduce((sum, r) => sum + r.percentage, 0) / allResults.length) * 100) / 100 || 0,
      passedAttempts: allResults.filter((r) => r.isPassed).length,
    };

    return res.status(200).json({
      success: true,
      message: "Results fetched successfully",
      data: results,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching results:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching results",
      error: error.message,
    });
  }
};

/**
 * Get all user's results across all tests
 * GET /api/results/user/all
 */
export const getAllUserResults = async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const { page = 1, limit = 20, category } = req.query;

    // Get user from Firebase UID
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userDbId = user._id;

    const filter = { userId: userDbId };
    if (category) {
      filter.testId = { $in: await MockTest.find({ category }).distinct("_id") };
    }

    const results = await TestResult.find(filter)
      .populate("testId", "title category difficulty")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ submittedAt: -1 });

    const total = await TestResult.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "All results fetched successfully",
      data: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all results:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching results",
      error: error.message,
    });
  }
};

/**
 * Get test leaderboard
 * GET /api/results/leaderboard/:testId
 */
export const getTestLeaderboard = async (req, res) => {
  try {
    const { testId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Get best score for each user
    const leaderboard = await TestResult.aggregate([
      { $match: { testId: new ObjectId(testId) } },
      {
        $group: {
          _id: "$userId",
          bestScore: { $max: "$percentage" },
          bestMarks: { $max: "$marksObtained" },
          totalAttempts: { $sum: 1 },
          passedAttempts: {
            $sum: { $cond: [{ $eq: ["$isPassed", true] }, 1, 0] },
          },
          lastAttemptDate: { $max: "$submittedAt" },
        },
      },
      { $sort: { bestScore: -1, bestMarks: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 },
    ]);

    // Get user details
    for (let i = 0; i < leaderboard.length; i++) {
      const user = await User.findById(leaderboard[i]._id).select("username email");
      leaderboard[i].username = user?.username;
      leaderboard[i].email = user?.email;
      leaderboard[i].rank = (page - 1) * limit + i + 1;
    }

    const total = await TestResult.distinct("userId", { testId });

    return res.status(200).json({
      success: true,
      message: "Leaderboard fetched successfully",
      data: leaderboard,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.length,
        pages: Math.ceil(total.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching leaderboard",
      error: error.message,
    });
  }
};

/**
 * Get user's performance analytics
 * GET /api/results/analytics/user
 */
export const getUserAnalytics = async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;

    // Get user from Firebase UID
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userDbId = user._id;

    const results = await TestResult.find({ userId: userDbId });

    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No results found",
        data: {
          totalTests: 0,
          totalAttempts: 0,
          passedTests: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 0,
          categoryWiseStats: [],
          difficultyWiseStats: [],
        },
      });
    }

    // Calculate overall stats
    const totalTests = await MockTest.countDocuments({
      _id: { $in: results.map((r) => r.testId) },
    });
    const totalAttempts = results.length;
    const passedTests = results.filter((r) => r.isPassed).length;
    const averageScore = Math.round((results.reduce((sum, r) => sum + r.percentage, 0) / totalAttempts) * 100) / 100;
    const bestScore = Math.max(...results.map((r) => r.percentage));
    const worstScore = Math.min(...results.map((r) => r.percentage));

    // Category-wise stats
    const categoryWiseStats = await TestResult.aggregate([
      { $match: { userId: userDbId } },
      {
        $lookup: {
          from: "mocktests",
          localField: "testId",
          foreignField: "_id",
          as: "test",
        },
      },
      { $unwind: "$test" },
      {
        $group: {
          _id: "$test.category",
          totalTests: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          passedTests: {
            $sum: { $cond: [{ $eq: ["$isPassed", true] }, 1, 0] },
          },
        },
      },
    ]);

    // Difficulty-wise stats
    const difficultyWiseStats = await TestResult.aggregate([
      { $match: { userId: userDbId } },
      {
        $lookup: {
          from: "mocktests",
          localField: "testId",
          foreignField: "_id",
          as: "test",
        },
      },
      { $unwind: "$test" },
      {
        $group: {
          _id: "$test.difficulty",
          totalTests: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          passedTests: {
            $sum: { $cond: [{ $eq: ["$isPassed", true] }, 1, 0] },
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Analytics fetched successfully",
      data: {
        totalTests,
        totalAttempts,
        passedTests,
        averageScore,
        bestScore,
        worstScore,
        categoryWiseStats: categoryWiseStats.map((stat) => ({
          category: stat._id,
          totalAttempts: stat.totalTests,
          averageScore: Math.round(stat.averageScore * 100) / 100,
          passedAttempts: stat.passedTests,
        })),
        difficultyWiseStats: difficultyWiseStats.map((stat) => ({
          difficulty: stat._id,
          totalAttempts: stat.totalTests,
          averageScore: Math.round(stat.averageScore * 100) / 100,
          passedAttempts: stat.passedTests,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching analytics",
      error: error.message,
    });
  }
};
