import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userModel",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MockTest",
      required: true,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestAttempt",
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    marksObtained: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctCount: {
      type: Number,
      required: true,
    },
    wrongCount: {
      type: Number,
      required: true,
    },
    unattemptedCount: {
      type: Number,
      required: true,
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
    passingPercentage: {
      type: Number,
      required: true,
    },
    totalTimeSpent: {
      type: Number, // in seconds
      required: true,
    },
    averageTimePerQuestion: {
      type: Number, // in seconds
    },
    rank: {
      type: Number,
    }, // Rank among all attempts
    categoryWiseScore: [
      {
        category: String,
        obtained: Number,
        total: Number,
        percentage: Number,
      },
    ],
    difficultyWiseScore: [
      {
        difficulty: String,
        obtained: Number,
        total: Number,
        percentage: Number,
      },
    ],
    submittedAt: {
      type: Date,
      required: true,
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for quick lookups
testResultSchema.index({ userId: 1, testId: 1 });
testResultSchema.index({ testId: 1, percentage: -1 }); // For leaderboard

export default mongoose.model("TestResult", testResultSchema);
