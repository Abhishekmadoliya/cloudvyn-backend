import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Subscription from "../models/Subscription.js";
import QuestionBank from "../models/questionBankModel.js";

const questionBankRouter = express.Router();

/**
 * Helper to check if a candidate has active PRO plan access.
 */
async function hasProQuestionBankAccess(user) {
  if (!user || !user._id) return false;
  if (user.role === "admin" || user.role === "Admin") return true;

  const sub = await Subscription.findOne({ userId: user._id });
  if (!sub) return false;

  const planKey = (sub.planKey || "").toLowerCase();
  const isProPlan = planKey === "pro"; // STRICTLY PRO ONLY (Excludes Free and Plus)
  const isCurrentlyActive = sub.paidUntil && new Date(sub.paidUntil) > new Date();

  return isProPlan && isCurrentlyActive;
}

/**
 * GET /api/question-bank
 * Candidate endpoint with Pro-tier access verification
 */
questionBankRouter.get("/", requireAuth, async (req, res) => {
  try {
    const isPro = await hasProQuestionBankAccess(req.dbUser);
    const { category, importance, difficulty, search, sortBy } = req.query;

    const totalCount = await QuestionBank.countDocuments({ isPublished: true });
    const categories = await QuestionBank.distinct("category", { isPublished: true });

    if (!isPro) {
      // Return locked metadata payload for Free & Plus users
      return res.json({
        success: true,
        isPro: false,
        userPlan: req.dbUser.role === "admin" ? "admin" : "other",
        totalQuestions: totalCount,
        categories: categories.length > 0 ? categories : [
          "Data Structures & Algorithms",
          "System Design",
          "SQL & Database",
          "Frontend Architecture",
          "Backend Engineering",
          "Behavioral & Leadership",
        ],
        message: "Question Bank with curated interview problems is exclusive to Cloudvyn Pro members.",
      });
    }

    // Pro User: Fetch Questions with Filters
    const query = { isPublished: true };

    if (category && category !== "All") {
      query.category = category;
    }

    if (importance && importance !== "All") {
      query.importance = importance.toLowerCase();
    }

    if (difficulty && difficulty !== "All") {
      query.difficulty = difficulty;
    }

    if (search) {
      query.$or = [
        { problemName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { companyTags: { $in: [new RegExp(search, "i")] } },
        { subCategory: { $regex: search, $options: "i" } },
      ];
    }

    let sortOptions = { upvotes: -1, createdAt: -1 };
    if (sortBy === "newest") {
      sortOptions = { createdAt: -1 };
    } else if (sortBy === "importance") {
      sortOptions = { importance: 1, upvotes: -1 };
    }

    const rawQuestions = await QuestionBank.find(query)
      .sort(sortOptions)
      .select("-__v");

    // Add hasUpvoted flag for candidate
    const userIdStr = req.dbUser._id.toString();
    const questions = rawQuestions.map((q) => {
      const qObj = q.toObject();
      qObj.hasUpvoted = Array.isArray(q.upvotedBy) && q.upvotedBy.some((id) => id?.toString() === userIdStr);
      // Omit detailed upvotedBy array from client payload
      delete qObj.upvotedBy;
      return qObj;
    });

    const highImportanceCount = await QuestionBank.countDocuments({ isPublished: true, importance: "high" });

    res.json({
      success: true,
      isPro: true,
      questions,
      categories,
      stats: {
        total: totalCount,
        highImportance: highImportanceCount,
        categoriesCount: categories.length,
      },
    });
  } catch (error) {
    console.error("GET /api/question-bank error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch question bank" });
  }
});

/**
 * POST /api/question-bank/:id/upvote
 * Toggle upvote on a problem
 */
questionBankRouter.post("/:id/upvote", requireAuth, async (req, res) => {
  try {
    const isPro = await hasProQuestionBankAccess(req.dbUser);
    if (!isPro) {
      return res.status(403).json({ success: false, message: "Upvoting is available to Pro members only." });
    }

    const { id } = req.params;
    const question = await QuestionBank.findById(id);

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const userId = req.dbUser._id;
    const hasUpvoted = question.upvotedBy && question.upvotedBy.some((uid) => uid.equals(userId));

    let updatedQuestion;
    if (hasUpvoted) {
      // Remove upvote
      updatedQuestion = await QuestionBank.findByIdAndUpdate(
        id,
        {
          $pull: { upvotedBy: userId },
          $inc: { upvotes: -1 },
        },
        { new: true }
      );
    } else {
      // Add upvote
      updatedQuestion = await QuestionBank.findByIdAndUpdate(
        id,
        {
          $addToSet: { upvotedBy: userId },
          $inc: { upvotes: 1 },
        },
        { new: true }
      );
    }

    res.json({
      success: true,
      upvoted: !hasUpvoted,
      upvotes: Math.max(0, updatedQuestion.upvotes || 0),
    });
  } catch (error) {
    console.error("POST /api/question-bank/:id/upvote error:", error);
    res.status(500).json({ success: false, message: "Failed to update upvote" });
  }
});

/**
 * GET /api/question-bank/:id
 * Single Question details
 */
questionBankRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const isPro = await hasProQuestionBankAccess(req.dbUser);
    if (!isPro) {
      return res.status(403).json({ success: false, message: "Access restricted to Pro members." });
    }

    const question = await QuestionBank.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const qObj = question.toObject();
    const userIdStr = req.dbUser._id.toString();
    qObj.hasUpvoted = Array.isArray(question.upvotedBy) && question.upvotedBy.some((id) => id?.toString() === userIdStr);
    delete qObj.upvotedBy;

    res.json({
      success: true,
      question: qObj,
    });
  } catch (error) {
    console.error("GET /api/question-bank/:id error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch question details" });
  }
});

export default questionBankRouter;
