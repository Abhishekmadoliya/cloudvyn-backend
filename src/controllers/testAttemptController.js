import TestAttempt from "../models/testAttemptModel.js";
import MockTest from "../models/mockTestModel.js";
import MCQQuestion from "../models/mcqQuestionModel.js";
import TestResult from "../models/testResultModel.js";
import userModel from "../models/userModel.js";

/**
 * Start a new test attempt
 * POST /api/attempts/start
 */
export const startTestAttempt = async (req, res) => {
  try {
    const { testId } = req.body;
    const userId = req.user?.uid;
    console.log("userid", userId);

    if (!testId) {
      return res.status(400).json({
        success: false,
        message: "testId is required",
      });
    }

    // get user id from userid 
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found",
      });
    }

    const user = await userModel.findOne({ firebaseUid: userId });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    } 


    const userDbId = user._id;



    // Verify test exists and is published
    const test = await MockTest.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Mock test not found",
      });
    }

    // if (!test.isPublished) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "This test is not available yet",
    //   });
    // }

    // Check if user already has an in-progress attempt
    const existingAttempt = await TestAttempt.findOne({
      userId: userDbId,
      testId,
      status: "in-progress",
    });

    // if (existingAttempt) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "You already have an in-progress attempt for this test",
    //     data: { attemptId: existingAttempt._id },
    //   });
    // }

    // Check attempt limit
    if (test.totalAttempts > 0) {
      const attemptCount = await TestAttempt.countDocuments({ userId: userDbId, testId });
      if (attemptCount >= test.totalAttempts) {
        return res.status(403).json({
          success: false,
          message: `You have reached the maximum attempts (${test.totalAttempts}) for this test`,
        });
      }
    }

    // Get attempt number
    const previousAttempts = await TestAttempt.countDocuments({ userId: userDbId, testId });
    const attemptNumber = previousAttempts + 1;

    // Fetch questions for the test FIRST
    const questions = await MCQQuestion.find({ testId })
      .select("_id questionText options marks difficulty categoryTag order codeSnippet")
      .sort({ order: 1 });

    // Pre-populate answers array with all questions
    const answersArray = questions.map((q) => ({
      questionId: q._id,
      selectedAnswer: null,
      isCorrect: null,
      marksObtained: 0,
      timeTaken: 0,
    }));

    // Create new attempt with pre-populated answers
    const newAttempt = new TestAttempt({
      userId: userDbId,
      testId,
      status: "in-progress",
      startedAt: new Date(),
      attemptNumber,
      answers: answersArray,
    });

    await newAttempt.save();

    // Randomize questions if enabled
    let questionsToReturn = questions;
    if (test.randomizeQuestions) {
      questionsToReturn = questions.sort(() => Math.random() - 0.5);
    }

    // Randomize options if enabled
    if (test.randomizeOptions) {
      questionsToReturn = questionsToReturn.map((q) => ({
        ...q.toObject(),
        options: q.options.sort(() => Math.random() - 0.5),
      }));
    }

    return res.status(201).json({
      success: true,
      message: "Test attempt started successfully",
      data: {
        attemptId: newAttempt._id,
        testId: test._id,
        title: test.title,
        duration: test.duration,
        totalQuestions: test.totalQuestions,
        totalMarks: test.totalMarks,
        instructions: test.instructions,
        questions: questionsToReturn,
        startedAt: newAttempt.startedAt,
      },
    });
  } catch (error) {
    console.error("Error starting test attempt:", error);
    return res.status(500).json({
      success: false,
      message: "Error starting test attempt",
      error: error.message,
    });
  }
};

/**
 * Save answer for a question (while in progress)
 * POST /api/attempts/:attemptId/save-answer
 */
export const saveAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedAnswer } = req.body;
    const firebaseUid = req.user?.uid;

    if (!questionId || !selectedAnswer) {
      return res.status(400).json({
        success: false,
        message: "questionId and selectedAnswer are required",
      });
    }

    // Get user from Firebase UID
    const user = await userModel.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userDbId = user._id;

    // Find attempt
    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify user is the one taking the test
    if (attempt.userId.toString() !== userDbId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Check if attempt is still in progress
    if (attempt.status !== "in-progress") {
      return res.status(400).json({
        success: false,
        message: "This attempt is no longer in progress",
      });
    }

    // Check time limit
    const test = await MockTest.findById(attempt.testId);
    const elapsedMinutes = (Date.now() - new Date(attempt.startedAt).getTime()) / (1000 * 60);

    if (elapsedMinutes > test.duration) {
      // Auto-submit the test
      attempt.status = "submitted";
      attempt.submittedAt = new Date();
      await attempt.save();

      return res.status(400).json({
        success: false,
        message: "Time limit exceeded. Test auto-submitted",
      });
    }

    // Check if answer already exists for this question
    const existingAnswerIndex = attempt.answers.findIndex((ans) => ans.questionId.toString() === questionId);

    if (existingAnswerIndex !== -1) {
      // Update existing answer
      attempt.answers[existingAnswerIndex].selectedAnswer = selectedAnswer;
    } else {
      // Add new answer
      attempt.answers.push({
        questionId,
        selectedAnswer,
        timeTaken: 0, // Will be calculated on submission
      });
    }

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "Answer saved successfully",
      data: { answersCount: attempt.answers.length },
    });
  } catch (error) {
    console.error("Error saving answer:", error);
    return res.status(500).json({
      success: false,
      message: "Error saving answer",
      error: error.message,
    });
  }
};

/**
 * Submit test attempt
 * POST /api/attempts/:attemptId/submit
 */
export const submitTestAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers: submittedAnswers } = req.body; // Answers might be sent from frontend
    const firebaseUid = req.user?.uid;

    // Get user from Firebase UID
    const user = await userModel.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userDbId = user._id;

    // Find attempt
    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify user
    if (attempt.userId.toString() !== userDbId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Check status
    if (attempt.status !== "in-progress") {
      return res.status(400).json({
        success: false,
        message: "This attempt has already been submitted",
      });
    }

    // If answers were sent from frontend, merge them with existing answers
    if (submittedAnswers && typeof submittedAnswers === 'object') {
      console.log('Merging formatted answers from frontend');
      for (const questionId in submittedAnswers) {
        const answerData = submittedAnswers[questionId];
        const answerIndex = attempt.answers.findIndex(
          (ans) => ans.questionId.toString() === questionId
        );
        
        if (answerIndex !== -1) {
          // Store both the text and index for flexibility
          attempt.answers[answerIndex].selectedAnswer = answerData.selectedText || answerData.selectedIndex;
          attempt.answers[answerIndex].selectedIndex = answerData.selectedIndex;
          console.log(`[${questionId}] Updated with text: "${answerData.selectedText}"`);
        }
      }
    }

    // Mark as submitted
    attempt.status = "submitted";
    attempt.submittedAt = new Date();
    attempt.totalTimeSpent = Math.floor((attempt.submittedAt - new Date(attempt.startedAt)) / 1000); // in seconds

    await attempt.save();

    // Evaluate the attempt
    const result = await evaluateAttempt(attempt);

    return res.status(200).json({
      success: true,
      message: "Test submitted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error submitting test:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting test",
      error: error.message,
    });
  }
};

/**
 * Evaluate attempt and calculate score
 * Internal function
 */
async function evaluateAttempt(attempt) {
  try {
    const test = await MockTest.findById(attempt.testId);
    const questions = await MCQQuestion.find({ testId: attempt.testId });

    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    let totalMarksObtained = 0;

    console.log(`\n=== EVALUATION STARTED ===`);
    console.log(`Test: ${test.title}, Total Questions: ${questions.length}`);
    console.log(`Attempt has ${attempt.answers.length} answers`);

    // Evaluate each answer
    for (let i = 0; i < attempt.answers.length; i++) {
      const answer = attempt.answers[i];
      const question = questions.find((q) => q._id.toString() === answer.questionId.toString());

      if (!question) {
        console.warn(`[Q${i + 1}] Question not found`);
        continue;
      }

      console.log(`\n[Q${i + 1}] ${question.questionText.substring(0, 50)}...`);
      console.log(`  Correct Answer in DB: "${question.correctAnswer}"`);
      console.log(`  User Selected: "${answer.selectedAnswer}"`);

      // If answer was not selected, mark as unattempted
      if (answer.selectedAnswer === null || answer.selectedAnswer === undefined) {
        answer.isCorrect = false;
        answer.marksObtained = 0;
        unattemptedCount++;
        console.log(`  Result: UNATTEMPTED ⏭️`);
        continue;
      }

      // Direct comparison: selectedAnswer (text) === correctAnswer (text from DB)
      // Both should now be strings (option text)
      const isCorrect = String(answer.selectedAnswer).trim() === String(question.correctAnswer).trim();
      
      answer.isCorrect = isCorrect;

      if (isCorrect) {
        answer.marksObtained = question.marks;
        totalMarksObtained += question.marks;
        correctCount++;
        console.log(`  Result: CORRECT ✅ (+${question.marks} marks)`);
      } else {
        answer.marksObtained = test.negativeMarking ? -test.negativeMarking : 0;
        totalMarksObtained += answer.marksObtained;
        wrongCount++;
        console.log(`  Result: WRONG ❌ (${test.negativeMarking ? '-' + test.negativeMarking : '0'} marks)`);
      }
    }

    // Count unattempted from answers with no selection
    unattemptedCount = attempt.answers.filter(a => a.selectedAnswer === null || a.selectedAnswer === undefined).length;

    // Update attempt with evaluation
    attempt.status = "evaluated";
    await attempt.save();

    // Calculate percentage
    const percentage = (totalMarksObtained / test.totalMarks) * 100;
    const isPassed = percentage >= test.passingPercentage;

    console.log(`\n=== EVALUATION SUMMARY ===`);
    console.log(`Correct: ${correctCount}, Wrong: ${wrongCount}, Unattempted: ${unattemptedCount}`);
    console.log(`Marks Obtained: ${totalMarksObtained}/${test.totalMarks}`);
    console.log(`Percentage: ${(Math.round(percentage * 100) / 100)}%`);
    console.log(`Passed: ${isPassed}`);
    console.log(`=== END EVALUATION ===\n`);

    // Create result document
    const result = new TestResult({
      userId: attempt.userId,
      testId: attempt.testId,
      attemptId: attempt._id,
      totalMarks: test.totalMarks,
      marksObtained: Math.max(0, totalMarksObtained), // Prevent negative score
      percentage: Math.round(percentage * 100) / 100,
      totalQuestions: questions.length,
      correctCount,
      wrongCount,
      unattemptedCount,
      isPassed,
      passingPercentage: test.passingPercentage,
      totalTimeSpent: attempt.totalTimeSpent,
      averageTimePerQuestion: Math.round(attempt.totalTimeSpent / questions.length),
      submittedAt: attempt.submittedAt,
    });

    await result.save();

    return {
      _id: result._id,
      attemptId: attempt._id,
      testId: test._id,
      title: test.title,
      marksObtained: Math.max(0, totalMarksObtained),
      totalMarks: test.totalMarks,
      percentage: Math.round(percentage * 100) / 100,
      correctCount,
      wrongCount,
      unattemptedCount,
      isPassed,
      passingPercentage: test.passingPercentage,
      totalTimeSpent: attempt.totalTimeSpent,
      submittedAt: attempt.submittedAt,
    };
  } catch (error) {
    console.error("Error evaluating attempt:", error);
    throw error;
  }
}

/**
 * Get attempt details
 * GET /api/attempts/:attemptId
 */
export const getAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const firebaseUid = req.user?.uid;
    console.log("firebaseUid", firebaseUid);

    // Get user from Firebase UID
    const user = await userModel.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userDbId = user._id;

    let attempt = await TestAttempt.findById(attemptId)
      .populate("testId", "title duration totalMarks totalQuestions")
      .populate({
        path: "answers.questionId",
        select: "questionText options correctAnswer explanation marks difficulty",
      });

    if (!attempt) {
      console.log("attempt not found");
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    console.log("attempt found, answers count:", attempt.answers.length);

    // Verify user
    if (attempt.userId.toString() !== userDbId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // If answers array is empty, populate it with all questions for the test
    if (attempt.answers.length === 0) {
      console.log("Answers array is empty, fetching questions for test:", attempt.testId);
      
      const questions = await MCQQuestion.find({ testId: attempt.testId })
        .select("_id questionText options marks difficulty")
        .sort({ order: 1 });

      console.log("Found", questions.length, "questions");

      // Pre-populate answers array
      attempt.answers = questions.map((q) => ({
        questionId: q._id,
        selectedAnswer: null,
        isCorrect: null,
        marksObtained: 0,
        timeTaken: 0,
      }));

      // Save the updated attempt
      await attempt.save();
      console.log("Attempt updated with questions");

      // Re-populate to get full question details
      attempt = await TestAttempt.findById(attemptId)
        .populate("testId", "title duration totalMarks totalQuestions")
        .populate({
          path: "answers.questionId",
          select: "questionText options correctAnswer explanation marks difficulty",
        });
    }

    return res.status(200).json({
      success: true,
      message: "Attempt details fetched",
      data: attempt,
    });
  } catch (error) {
    console.error("Error fetching attempt details:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching attempt details",
      error: error.message,
    });
  }
};

/**
 * Get user's test attempts
 * GET /api/attempts/test/:testId
 */
export const getUserTestAttempts = async (req, res) => {
  try {
    const { testId } = req.params;
    const firebaseUid = req.user?.uid;
    const { page = 1, limit = 10 } = req.query;

    // Get user from Firebase UID
    const user = await userModel.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userDbId = user._id;

    const attempts = await TestAttempt.find({ userId: userDbId, testId })
      .select("attemptNumber status startedAt submittedAt totalTimeSpent")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await TestAttempt.countDocuments({ userId: userDbId, testId });

    return res.status(200).json({
      success: true,
      message: "Attempts fetched successfully",
      data: attempts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching attempts:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching attempts",
      error: error.message,
    });
  }
};
