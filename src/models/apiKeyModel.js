import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Firebase UID
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["gemini", "groq", "openai"],
      default: "gemini",
    },
    apiKey: {
      type: String,
      required: true,
    },
    maskedKey: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ApiKey", apiKeySchema);
