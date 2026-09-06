import MockTest from "../models/mockTestModel.js";
import MCQQuestion from "../models/mcqQuestionModel.js";
import TestAttempt from "../models/testAttemptModel.js";
import TestResult from "../models/testResultModel.js";
import userModel from "../models/userModel.js";

/**
 * Create a new mock test (Admin only)
 * POST /api/tests
 */
export const createMockTest = async (req, res) => {
  try {
    const { title, description, category, difficulty, duration, totalMarks, totalQuestions, slug, instructions } = req.body;
    const userId = req.user?.uid;

    // Validate required fields
    if (!title || !description || !category || !duration || !totalMarks || !slug) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, description, category, duration, totalMarks, slug",
      });
    }

    const user = await userModel.findOne({firebaseUid: userId});
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

   const candidateID = user._id;
   console.log("userid", userId);
   console.log("candidateID", candidateID);
   

    // Check if slug already exists
    const existingTest = await MockTest.findOne({ slug });
    if (existingTest) {
      return res.status(400).json({
        success: false,
        message: "Test with this slug already exists",
      });
    }

    const newTest = new MockTest({
      title,
      description,
      category,
      difficulty,
      duration,
      totalMarks,
      totalQuestions,
      slug,
      instructions,
      createdBy: candidateID,
      isPublished: false,
    });

    await newTest.save();

    return res.status(201).json({
      success: true,
      message: "Mock test created successfully",
      data: newTest,
    });
  } catch (error) {
    console.error("Error creating mock test:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating mock test",
      error: error.message,
    });
  }
};

/**
 * Get all mock tests with pagination and filters
 * GET /api/tests?page=1&limit=10&category=DSA&difficulty=Medium
 */
export const getAllMockTests = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, difficulty, isPublished = true } = req.query;

    const filter = { isPublished: isPublished === 'true' || isPublished === true };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    console.log("getAllMockTests - Filter:", filter);

    // const tests = await MockTest.find(filter)
    //   .populate("createdBy", "username email")
    //   .limit(limit * 1)
    //   .skip((page - 1) * limit)
    //   .sort({ createdAt: -1 });
    const tests = await MockTest.find({})

    const total = await MockTest.countDocuments(filter);

    console.log("getAllMockTests - Found tests:", tests.length, "Total:", total);

    return res.status(200).json({
      success: true,
      message: "Mock tests fetched successfully",
      data: tests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching mock tests:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching mock tests",
      error: error.message,
    });
  }
};

/**
 * Get single mock test by ID (populated with questions)
 * GET /api/tests/:id
 */
export const getMockTestById = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await MockTest.findById(id)
      .populate("createdBy", "username email")
      .populate({
        path: "questions",
        select: "questionText options marks difficulty categoryTag order",
      });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Mock test not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mock test fetched successfully",
      data: test,
    });
  } catch (error) {
    console.error("Error fetching mock test:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching mock test",
      error: error.message,
    });
  }
};

/**
 * Update mock test (Admin only)
 * PUT /api/tests/:id
 */
export const updateMockTest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating createdBy
    delete updates.createdBy;

    const updatedTest = await MockTest.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!updatedTest) {
      return res.status(404).json({
        success: false,
        message: "Mock test not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mock test updated successfully",
      data: updatedTest,
    });
  } catch (error) {
    console.error("Error updating mock test:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating mock test",
      error: error.message,
    });
  }
};

/**
 * Publish/Unpublish mock test
 * PATCH /api/tests/:id/publish
 */
export const publishMockTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    const test = await MockTest.findById(id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Mock test not found",
      });
    }

    test.isPublished = isPublished;
    await test.save();

    return res.status(200).json({
      success: true,
      message: `Mock test ${isPublished ? "published" : "unpublished"} successfully`,
      data: test,
    });
  } catch (error) {
    console.error("Error publishing mock test:", error);
    return res.status(500).json({
      success: false,
      message: "Error publishing mock test",
      error: error.message,
    });
  }
};

/**
 * Delete mock test (Admin only)
 * DELETE /api/tests/:id
 */
export const deleteMockTest = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await MockTest.findByIdAndDelete(id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Mock test not found",
      });
    }

    // Delete associated questions
    await MCQQuestion.deleteMany({ testId: id });

    // Delete associated attempts and results
    await TestAttempt.deleteMany({ testId: id });
    await TestResult.deleteMany({ testId: id });

    return res.status(200).json({
      success: true,
      message: "Mock test deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting mock test:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting mock test",
      error: error.message,
    });
  }
};

/**
 * Get all mock test categories
 * GET /api/tests/categories
 */
export const getAllMockTestCategory = async (req, res) => {
  try {
    const categories = await MockTest.distinct("category", { isPublished: true });

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error.message,
    });
  }
};

/**
 * Get tests by category
 * GET /api/categories/:slug/tests
 */
export const getTestByCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const tests = await MockTest.find({ category: slug, isPublished: true })
      .populate("createdBy", "username email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await MockTest.countDocuments({ category: slug, isPublished: true });

    return res.status(200).json({
      success: true,
      message: "Tests fetched successfully",
      data: tests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tests by category:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching tests by category",
      error: error.message,
    });
  }
};