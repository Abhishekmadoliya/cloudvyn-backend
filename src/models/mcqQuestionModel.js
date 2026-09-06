import mongoose from "mongoose";

const mcqQuestionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MockTest",
      required: true,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    options: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        text: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
      },
    ],
    correctAnswer: {
      type: String,
      required: true, // Option ID or text
    },
    marks: {
      type: Number,
      required: true,
      default: 1,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    explanation: {
      type: String,
    },
    categoryTag: {
      type: String,
    },
    order: {
      type: Number, // order of question in test
    },
    imageUrl: {
      type: String,
    },
    codeSnippet: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userModel",
      // required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("MCQQuestion", mcqQuestionSchema);
