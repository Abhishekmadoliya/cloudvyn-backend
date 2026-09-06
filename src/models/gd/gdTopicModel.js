import mongoose from "mongoose";

const gdTopicSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["current_affairs", "abstract", "case_study", "controversial"],
      default: "current_affairs",
      index: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    suggestedStances: {
      type: [String],
      default: ["for", "against", "neutral"],
    },
    tags: [{ type: String }],
    usageCount: {
      type: Number,
      default: 0,
    },
    isSeed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("GDTopic", gdTopicSchema, "gd_topics");
