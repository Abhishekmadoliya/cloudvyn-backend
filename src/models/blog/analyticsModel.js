import mongoose from "mongoose";

/**
 * Analytics Model
 * Stores weekly GSC performance metrics per published blog post.
 * Updated by the weekly analytics cron job.
 */
const analyticsSchema = new mongoose.Schema(
  {
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "blog_post",
      required: true,
    },

    // WordPress post ID — used as GSC URL lookup key
    wp_id: {
      type: Number,
      default: null,
    },

    // The canonical URL pulled from WordPress
    url: {
      type: String,
      default: null,
    },

    // GSC metrics (7-day rolling window)
    impressions: {
      type: Number,
      default: 0,
    },

    clicks: {
      type: Number,
      default: 0,
    },

    ctr: {
      type: Number,
      default: 0, // decimal, e.g. 0.045 = 4.5%
    },

    avg_position: {
      type: Number,
      default: null,
    },

    // Timestamp of last GSC pull
    pulled_at: {
      type: Date,
      default: null,
    },

    // Historical snapshots — stored for trend analysis
    history: [
      {
        impressions: Number,
        clicks: Number,
        ctr: Number,
        avg_position: Number,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// One analytics doc per post
analyticsSchema.index({ post_id: 1 }, { unique: true });

export default mongoose.model("blog_analytics", analyticsSchema);
