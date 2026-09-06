import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    }, // e.g., DSA, React, DBMS, HR
    subCategory: {
      type: String,
    }, // e.g., Arrays, Strings
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
    },
    answer: {
      type: String,
      required: true,
    },
    hints: {
      type: String,
    },
    companyTags: {
      type: [String],
      default: [],
    }, // Amazon, Google etc.
    slug: {
  type: String,
  unique: true,
  required: true,
},
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Reference to User model
  },
  { timestamps: true }
);

export default mongoose.model("Questions", questionSchema);
