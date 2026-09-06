import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'userModel',
      required: true,
    },

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedPost',
      required: true,
    },

    type: {
      type: String,
      enum: ['like', 'clap', 'insightful', 'save', 'dislike'],
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate reactions — one reaction type per user per post
reactionSchema.index({ user: 1, post: 1, type: 1 }, { unique: true });

export default mongoose.model('Reaction', reactionSchema);
