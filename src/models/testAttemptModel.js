import mongoose from "mongoose";

const testAttemptSchema = new mongoose.Schema(
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
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MCQQuestion",
          required: true,
        },
        selectedAnswer: {
          type: String,
        },
        isCorrect: {
          type: Boolean,
        },
        marksObtained: {
          type: Number,
          default: 0,
        },
        timeTaken: {
          type: Number, // in seconds
        },
      },
    ],
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["in-progress", "submitted", "evaluated"],
      default: "in-progress",
    },
    totalTimeSpent: {
      type: Number, // in seconds
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Compound index to prevent multiple simultaneous attempts
testAttemptSchema.index({ userId: 1, testId: 1, status: 1 });

export default mongoose.model("TestAttempt", testAttemptSchema);
