import mongoose from 'mongoose';

const feedPostSchema = new mongoose.Schema(
  {
    authorPersona: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      required: true,
    },
    headline: { type: String },
    content: { type: String, required: true },

    summary: { type: String }, // short excerpt for feed preview

    category: { type: String }, // 'AI', 'Cloud', 'Security', 'Dev', etc.

    tags: [String],

    topic: { type: String },

    sourceRefs: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Source' },
    ],

    credibilityScore: { type: Number, default: 75, min: 0, max: 100 },

    importanceScore: { type: Number, default: 50, min: 0, max: 100 },

    // AI Confidence in the info accuracy
    aiConfidence: { type: Number, default: 80, min: 0, max: 100 },

    // Debate/thread support
    isDebate: { type: Boolean, default: false },
    parentPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedPost',
      default: null,
    },

    media: [String], // image URLs, infographic links

    stats: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      claps: { type: Number, default: 0 },
      insightful: { type: Number, default: 0 },
      dislikes: { type: Number, default: 0 },
    },

    rankingScore: { type: Number, default: 0 },

    trendVelocity: { type: Number, default: 0 }, // rate of engagement growth

    status: {
      type: String,
      enum: ['published', 'pending', 'flagged', 'draft'],
      default: 'published',
    },

    flagReason: { type: String, default: null },
    slug: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Performance indexes
feedPostSchema.index({ createdAt: -1 });
feedPostSchema.index({ rankingScore: -1 });
feedPostSchema.index({ tags: 1 });
feedPostSchema.index({ topic: 1 });
feedPostSchema.index({ category: 1 });
feedPostSchema.index({ status: 1 });
feedPostSchema.index({ slug: 1 });
feedPostSchema.index({ authorPersona: 1 });

export default mongoose.model('FeedPost', feedPostSchema);
