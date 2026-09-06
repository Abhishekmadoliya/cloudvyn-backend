import mongoose from "mongoose";

/**
 * Retry Log Model
 * Tracks every retry event in the pipeline.
 * Used to enforce max retry limits and for debugging.
 */
const retryLogSchema = new mongoose.Schema({
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "blog_post",
    required: true,
    index: true,
  },

  stage: {
    type: String,
    required: true,
  },

  attempt: {
    type: Number,
    required: true,
  },

  reason: {
    type: String,
    required: true,
  },

  // Extra context — e.g. plagiarism scores that triggered a retry
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

retryLogSchema.index({ post_id: 1, stage: 1 });

export default mongoose.model("blog_retry_log", retryLogSchema);
