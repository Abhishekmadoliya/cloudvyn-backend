import express from "express";
import { requireAdminAuth } from "../../middleware/requireAuth.js";
import MockTest from "../../models/mockTestModel.js";
import MCQQuestion from "../../models/mcqQuestionModel.js";

const mockTestAdminRouter = express.Router();

// Enforce admin authentication
mockTestAdminRouter.use(requireAdminAuth);

/**
 * GET /api/admin/mock-tests/all
 * Fetch all mock tests with question counts
 */
mockTestAdminRouter.get("/all", async (req, res) => {
  try {
    const tests = await MockTest.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "Fetched all mock tests",
      data: tests,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/mock-tests/all:", error);
    return res.status(500).json({ success: false, message: "Server error fetching mock tests" });
  }
});

/**
 * POST /api/admin/mock-tests/create
 * Create a new mock test
 */
mockTestAdminRouter.post("/create", async (req, res) => {
  try {
    const { title, description, category, difficulty, duration, totalMarks, totalQuestions, slug, instructions } = req.body;
    if (!title || !category || !slug) {
      return res.status(400).json({
        success: false,
        message: "Title, category, and slug are required fields.",
      });
    }

    const existingTest = await MockTest.findOne({ slug });
    if (existingTest) {
      return res.status(400).json({ success: false, message: "Test with this slug already exists" });
    }

    const newTest = new MockTest({
      title,
      description,
      category,
      difficulty: difficulty || "Medium",
      duration: duration || 30,
      totalMarks: totalMarks || 100,
      totalQuestions: totalQuestions || 10,
      slug,
      instructions: instructions || [],
      createdBy: req.dbUser._id,
      isPublished: true,
    });

    await newTest.save();
    return res.status(201).json({
      success: true,
      message: "Mock test created successfully",
      data: newTest,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/mock-tests/create:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error creating mock test" });
  }
});

/**
 * PUT /api/admin/mock-tests/update/:id
 * Update mock test
 */
mockTestAdminRouter.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const test = await MockTest.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    if (!test) {
      return res.status(404).json({ success: false, message: "Mock test not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Mock test updated successfully",
      data: test,
    });
  } catch (error) {
    console.error("Error in PUT /api/admin/mock-tests/update:", error);
    return res.status(500).json({ success: false, message: "Server error updating mock test" });
  }
});

/**
 * DELETE /api/admin/mock-tests/delete/:id
 * Delete mock test and its questions
 */
mockTestAdminRouter.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const test = await MockTest.findByIdAndDelete(id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Mock test not found" });
    }

    await MCQQuestion.deleteMany({ testId: id });

    return res.status(200).json({
      success: true,
      message: "Mock test and associated questions deleted successfully",
      data: test,
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/mock-tests/delete:", error);
    return res.status(500).json({ success: false, message: "Server error deleting mock test" });
  }
});

export default mockTestAdminRouter;
