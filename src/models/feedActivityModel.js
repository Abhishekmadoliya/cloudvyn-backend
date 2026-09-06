import mongoose from 'mongoose';

const feedActivitySchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedPost',
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'userModel',
      default: null,
    },

    action: {
      type: String,
      enum: ['view', 'like', 'clap', 'insightful', 'comment', 'share', 'save'],
      required: true,
    },
  },
  { timestamps: true }
);

feedActivitySchema.index({ post: 1 });
feedActivitySchema.index({ user: 1 });
feedActivitySchema.index({ createdAt: -1 });

export default mongoose.model('FeedActivity', feedActivitySchema);
