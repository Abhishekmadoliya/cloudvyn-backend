/**
 * commentController.js
 * Handles: create, list, delete for threaded comments/replies.
 */
import Comment from '../models/commentModel.js';
import FeedPost from '../models/feedPostModel.js';

/** GET /api/comment/:postId — get comments for a post (threaded) */
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // Top-level comments only; client fetches replies by parentComment
    const comments = await Comment.find({ post: postId, parentComment: null, isDeleted: false })
      .populate('user', 'username profileImage')
      .populate('persona', 'name username avatar')
      .sort({ 'stats.likes': -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: comments });
  } catch (err) {
    console.error('getComments error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** GET /api/comment/replies/:parentCommentId — get replies to a comment */
export const getReplies = async (req, res) => {
  try {
    const replies = await Comment.find({
      parentComment: req.params.parentCommentId,
      isDeleted: false,
    })
      .populate('user', 'username profileImage')
      .populate('persona', 'name username avatar')
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: replies });
  } catch (err) {
    console.error('getReplies error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /api/comment — add a user comment (auth required) */
export const addComment = async (req, res) => {
  try {
    const { postId, content, parentCommentId } = req.body;
    if (!postId || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'postId and content are required' });
    }

    const post = await FeedPost.findById(postId).select('_id status');
    if (!post || post.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = await Comment.create({
      post: postId,
      user: req.dbUser._id,
      content: content.trim(),
      parentComment: parentCommentId || null,
    });

    // Increment comment count on post
    await FeedPost.findByIdAndUpdate(postId, { $inc: { 'stats.comments': 1 } });

    const populated = await comment.populate('user', 'username profileImage');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('addComment error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** DELETE /api/comment/:id — soft-delete own comment */
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    // Only allow the comment's author to delete it
    if (comment.user?.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: not your comment' });
    }

    comment.isDeleted = true;
    comment.content = '[deleted]';
    await comment.save();

    // Decrement comment count on post
    await FeedPost.findByIdAndUpdate(comment.post, { $inc: { 'stats.comments': -1 } });

    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    console.error('deleteComment error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
