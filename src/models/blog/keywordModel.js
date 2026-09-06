import mongoose from "mongoose";

/**
 * Keyword Model
 * Stores all SEO keywords for blog automation pipeline.
 * Source can be Google Search Console, manual entry, or SERP discovery.
 */
const keywordSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },

    // Monthly search volume estimate (from GSC or manual)
    search_volume: {
      type: Number,
      default: 0,
    },

    // Keyword difficulty score (0–100). Filter: KD < 40 preferred.
    kd_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Higher = picked sooner by orchestrator
    priority: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },

    status: {
      type: String,
      enum: ["queued", "in_progress", "published", "skipped"],
      default: "queued",
      index: true,
    },

    // Where this keyword came from
    source: {
      type: String,
      enum: ["gsc", "manual", "serp"],
      default: "manual",
    },

    added_at: {
      type: Date,
      default: Date.now,
    },

    // Reference to the post if published
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "blog_post",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: orchestrator sorts by priority desc, filters by status
keywordSchema.index({ status: 1, priority: -1, kd_score: 1 });

export default mongoose.model("keyword", keywordSchema);
