import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, required: true },
    slug: { type: String, unique: true, required: true },

    category: { type: String }, // 'AI', 'Web Dev', 'Security', etc.

    popularityScore: { type: Number, default: 0 },

    postCount: { type: Number, default: 0 },

    trendVelocity: { type: Number, default: 0 }, // rate of score growth
  },
  { timestamps: true }
);

topicSchema.index({ popularityScore: -1 });

export default mongoose.model('Topic', topicSchema);
