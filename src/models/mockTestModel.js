import mongoose from "mongoose";

const mockTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    }, // e.g., "JavaScript", "DSA", "System Design"
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    duration: {
      type: Number,
      required: true, // in minutes
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    negativeMarking: {
      type: Number,
      default: 0, // marks deducted for wrong answer
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MCQQuestion",
      },
    ], // Array of question IDs
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userModel",
      // required: true,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    instructions: {
      type: String,
    },
    showResultAfterSubmission: {
      type: Boolean,
      default: true,
    },
    randomizeQuestions: {
      type: Boolean,
      default: false,
    },
    randomizeOptions: {
      type: Boolean,
      default: false,
    },
    passingPercentage: {
      type: Number,
      default: 40, // percentage needed to pass
    },
    totalAttempts: {
      type: Number,
      default: 0, // 0 means unlimited
    },
  },
  { timestamps: true }
);

export default mongoose.model("MockTest", mockTestSchema);
