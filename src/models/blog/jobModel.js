import mongoose from "mongoose";

/**
 * Job Model
 * Tracks each pipeline stage for a blog post.
 * One document per post — updated as stages progress.
 * Allows crash recovery: resume from last completed stage.
 */

const STAGES = [
  "serp",         // Stage 3: SERP research
  "content",      // Stage 4: Gemini content generation
  "image",        // Stage 5: Cover image generation & GCS upload
  "plagiarism",   // Stage 6: Originality.ai check
  "seo",          // Stage 9: SEO finalization
  "publish",      // Stage 10: WordPress publish
  "indexing",     // Stage 11: Google Indexing API
];

const jobSchema = new mongoose.Schema(
  {
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "blog_post",
      required: true,
      index: true,
    },

    keyword_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "keyword",
    },

    // Current or last completed stage
    stage: {
      type: String,
      enum: STAGES,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "retrying"],
      default: "pending",
      index: true,
    },

    // Raw SERP research data — stored so content stage doesn't re-fetch
    research_data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Stage-level results stored for audit/debug
    stage_results: {
      serp: { type: mongoose.Schema.Types.Mixed, default: null },
      content: { type: mongoose.Schema.Types.Mixed, default: null },
      image: { type: mongoose.Schema.Types.Mixed, default: null },
      plagiarism: { type: mongoose.Schema.Types.Mixed, default: null },
      seo: { type: mongoose.Schema.Types.Mixed, default: null },
      publish: { type: mongoose.Schema.Types.Mixed, default: null },
      indexing: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    retry_count: {
      type: Number,
      default: 0,
    },

    // Rolling error log — appended on each failure
    error_log: [
      {
        stage: String,
        error: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    started_at: {
      type: Date,
      default: Date.now,
    },

    completed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export { STAGES };
export default mongoose.model("blog_job", jobSchema);
