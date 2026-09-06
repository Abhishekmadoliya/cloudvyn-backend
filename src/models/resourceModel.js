import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "DSA Cheat Sheets",
        "System Design",
        "Interview Prep Guides",
        "Resume Templates",
        "Behavioral Frameworks",
        "Tech Deep Dives",
        "General",
      ],
      default: "General",
    },
    resourceType: {
      type: String,
      enum: ["file", "link", "article"],
      default: "file",
    },
    // Used when resourceType === "file" or "link"
    fileUrl: {
      type: String,
      default: null,
    },
    fileType: {
      type: String, // e.g. "pdf", "zip", "doc", "link", "markdown"
      default: "pdf",
    },
    fileSize: {
      type: String, // e.g. "2.4 MB"
      default: null,
    },
    // Used when resourceType === "article"
    content: {
      type: String, // Full article text / markdown
      default: null,
    },
    readTime: {
      type: String, // e.g. "5 min read"
      default: "5 min read",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    targetTier: {
      type: [String],
      enum: ["free", "plus", "pro"],
      default: ["plus", "pro"],
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userModel",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Resource", resourceSchema);
