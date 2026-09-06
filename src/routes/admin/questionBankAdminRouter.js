import express from "express";
import QuestionBank from "../../models/questionBankModel.js";

const questionBankAdminRouter = express.Router();

/**
 * GET /api/admin/question-bank
 * List all questions with filtering for Admin Console
 */
questionBankAdminRouter.get("/", async (req, res) => {
  try {
    const { category, importance, difficulty, search } = req.query;
    const query = {};

    if (category && category !== "All") query.category = category;
    if (importance && importance !== "All") query.importance = importance.toLowerCase();
    if (difficulty && difficulty !== "All") query.difficulty = difficulty;

    if (search) {
      query.$or = [
        { problemName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { companyTags: { $in: [new RegExp(search, "i")] } },
        { subCategory: { $regex: search, $options: "i" } },
      ];
    }

    const questions = await QuestionBank.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    const categories = await QuestionBank.distinct("category");

    res.json({
      success: true,
      questions,
      categories,
    });
  } catch (error) {
    console.error("GET /api/admin/question-bank error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch questions" });
  }
});

/**
 * POST /api/admin/question-bank
 * Create a new question in the Question Bank
 */
questionBankAdminRouter.post("/", async (req, res) => {
  try {
    const {
      problemName,
      description,
      category,
      subCategory,
      importance,
      difficulty,
      examples,
      constraints,
      hints,
      companyTags,
      solutionApproach,
      targetTier,
      isPublished,
    } = req.body;

    if (!problemName || !problemName.trim()) {
      return res.status(400).json({ success: false, message: "Problem name is required" });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: "Problem description is required" });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    const newQuestion = await QuestionBank.create({
      problemName: problemName.trim(),
      description: description.trim(),
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : "",
      importance: importance ? importance.toLowerCase() : "high",
      difficulty: difficulty || "Medium",
      examples: Array.isArray(examples) ? examples : [],
      constraints: Array.isArray(constraints)
        ? constraints
        : typeof constraints === "string"
        ? constraints.split("\n").map((c) => c.trim()).filter(Boolean)
        : [],
      hints: Array.isArray(hints)
        ? hints
        : typeof hints === "string"
        ? hints.split("\n").map((h) => h.trim()).filter(Boolean)
        : [],
      companyTags: Array.isArray(companyTags)
        ? companyTags
        : typeof companyTags === "string"
        ? companyTags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      solutionApproach: solutionApproach ? solutionApproach.trim() : "",
      answer: req.body.answer ? req.body.answer.trim() : "",
      hasCodeEditor: req.body.hasCodeEditor !== undefined ? req.body.hasCodeEditor : true,
      targetTier: targetTier || ["pro"],
      isPublished: isPublished !== undefined ? isPublished : true,
      createdBy: req.dbUser?._id,
    });

    res.status(201).json({
      success: true,
      message: "Question added to Question Bank successfully",
      question: newQuestion,
    });
  } catch (error) {
    console.error("POST /api/admin/question-bank error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create question" });
  }
});

/**
 * PUT /api/admin/question-bank/:id
 * Update question
 */
questionBankAdminRouter.put("/:id", async (req, res) => {
  try {
    const {
      problemName,
      description,
      category,
      subCategory,
      importance,
      difficulty,
      examples,
      constraints,
      hints,
      companyTags,
      solutionApproach,
      targetTier,
      isPublished,
    } = req.body;

    const updateData = { ...req.body };

    if (typeof constraints === "string") {
      updateData.constraints = constraints.split("\n").map((c) => c.trim()).filter(Boolean);
    }
    if (typeof hints === "string") {
      updateData.hints = hints.split("\n").map((h) => h.trim()).filter(Boolean);
    }
    if (typeof companyTags === "string") {
      updateData.companyTags = companyTags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (importance) {
      updateData.importance = importance.toLowerCase();
    }

    const updated = await QuestionBank.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    res.json({
      success: true,
      message: "Question updated successfully",
      question: updated,
    });
  } catch (error) {
    console.error("PUT /api/admin/question-bank/:id error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update question" });
  }
});

/**
 * DELETE /api/admin/question-bank/:id
 * Delete question
 */
questionBankAdminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await QuestionBank.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    res.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/admin/question-bank/:id error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete question" });
  }
});

export default questionBankAdminRouter;
