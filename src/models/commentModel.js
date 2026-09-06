import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedPost',
      required: true,
    },

    // Either a user OR a persona writes the comment
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'userModel',
      default: null,
    },

    persona: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      default: null,
    },

    content: { type: String, required: true },

    // Supports nested replies
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },

    stats: {
      likes: { type: Number, default: 0 },
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ parentComment: 1 });

export default mongoose.model('Comment', commentSchema);
