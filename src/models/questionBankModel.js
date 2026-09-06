import mongoose from "mongoose";

const exampleSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    output: { type: String, default: "" },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const questionBankSchema = new mongoose.Schema(
  {
    problemName: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    subCategory: {
      type: String,
      default: "",
    },
    importance: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "high",
      index: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    examples: {
      type: [exampleSchema],
      default: [],
    },
    constraints: {
      type: [String],
      default: [],
    },
    hints: {
      type: [String],
      default: [],
    },
    companyTags: {
      type: [String],
      default: [],
    },
    solutionApproach: {
      type: String,
      default: "",
    },
    answer: {
      type: String,
      default: "",
    },
    hasCodeEditor: {
      type: Boolean,
      default: true,
    },
    upvotes: {
      type: Number,
      default: 0,
      index: true,
    },
    upvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userModel",
      },
    ],
    targetTier: {
      type: [String],
      default: ["pro"],
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userModel",
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate unique slug if not provided
questionBankSchema.pre("save", function (next) {
  if (!this.slug && this.problemName) {
    this.slug =
      this.problemName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 7);
  }
  next();
});

export default mongoose.model("QuestionBank", questionBankSchema);
