import MCQQuestion from "../models/mcqQuestionModel.js";
import MockTest from "../models/mockTestModel.js";
import { ObjectId } from "mongodb";
import userModel from "../models/userModel.js";


/**
 * Add a new question to a test
 * POST /api/questions
 */
export const addQuestion = async (req, res) => {
  try {
    const { testId, questionText, options, correctAnswer, marks, difficulty, explanation, categoryTag, order, codeSnippet } = req.body;
    const userId = req.user?.uid;

    // Validate required fields
    if (!testId || !questionText || !options || !correctAnswer || !marks) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: testId, questionText, options, correctAnswer, marks",
      });
    }

    const user = await userModel.findOne({ firebaseUid: userId });
   const userdbid = user._id;


    // Validate options format
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Question must have at least 2 options",
      });
    }

    // Verify test exists
    const test = await MockTest.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Mock test not found",
      });
    }

    // Ensure options have correct structure
//  import { ObjectId } from "mongodb";

const formattedOptions = options.map((opt) => ({
  _id: new ObjectId(),
  text: opt?.text || opt,
  isCorrect: opt?.isCorrect ?? false,
}));


    const newQuestion = new MCQQuestion({
      testId,
      questionText,
      options: formattedOptions,
      correctAnswer,
      marks,
      difficulty,
      explanation,
      categoryTag,
      order,
      codeSnippet,
      createdBy: userdbid,
    });

    await newQuestion.save();

    // Add question to test's questions array
    test.questions.push(newQuestion._id);
    test.totalQuestions = test.questions.length;
    await test.save();

    return res.status(201).json({
      success: true,
      message: "Question added successfully",
      data: newQuestion,
    });
  } catch (error) {
    console.error("Error adding question:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding question",
      error: error.message,
    });
  }
};

/**
 * Get all questions for a test
 * GET /api/questions/:testId
 */
export const getQuestionsForTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify test exists
    const test = await MockTest.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Mock test not found",
      });
    }

    const questions = await MCQQuestion.find({ testId })
      .select("questionText options marks difficulty categoryTag order explanation codeSnippet")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ order: 1 });

    const total = await MCQQuestion.countDocuments({ testId });

    return res.status(200).json({
      success: true,
      message: "Questions fetched successfully",
      data: questions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching questions",
      error: error.message,
    });
  }
};

/**
 * Get single question (with answer hidden for users)
 * GET /api/questions/:id/public
 */
export const getQuestionPublic = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await MCQQuestion.findById(id).select("-correctAnswer -explanation -createdBy");

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Question fetched successfully",
      data: question,
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching question",
      error: error.message,
    });
  }
};

/**
 * Update question
 * PUT /api/questions/:id
 */
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates.testId;
    delete updates.createdBy;

    const updatedQuestion = await MCQQuestion.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!updatedQuestion) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating question",
      error: error.message,
    });
  }
};

/**
 * Delete question
 * DELETE /api/questions/:id
 */
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await MCQQuestion.findByIdAndDelete(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Remove question from test's questions array
    await MockTest.findByIdAndUpdate(question.testId, {
      $pull: { questions: id },
      $inc: { totalQuestions: -1 },
    });

    return res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting question",
      error: error.message,
    });
  }
};

/**
 * Bulk add questions to test
 * POST /api/questions/bulk/add
 */
export const bulkAddQuestions = async (req, res) => {
  try {
    const { testId, questions } = req.body;
    const userId = req.user?.uid;

    if (!testId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid testId or questions array",
      });
    }

    // Verify test exists
    const test = await MockTest.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Mock test not found",
      });
    }

    const addedQuestions = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Format options
      const formattedOptions = q.options.map((opt) => ({
        _id: new ObjectId(),
        text: opt.text || opt,
        isCorrect: opt.isCorrect || false,
      }));

      const newQuestion = new MCQQuestion({
        testId,
        questionText: q.questionText,
        options: formattedOptions,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 1,
        difficulty: q.difficulty || "Medium",
        explanation: q.explanation,
        categoryTag: q.categoryTag,
        order: q.order || i,
        codeSnippet: q.codeSnippet,
        createdBy: userId,
      });

      await newQuestion.save();
      addedQuestions.push(newQuestion._id);
    }

    // Update test with all new questions
    test.questions.push(...addedQuestions);
    test.totalQuestions = test.questions.length;
    await test.save();

    return res.status(201).json({
      success: true,
      message: `${addedQuestions.length} questions added successfully`,
      data: { questionsAdded: addedQuestions.length },
    });
  } catch (error) {
    console.error("Error bulk adding questions:", error);
    return res.status(500).json({
      success: false,
      message: "Error bulk adding questions",
      error: error.message,
    });
  }
};
