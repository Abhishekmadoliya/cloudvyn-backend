/**
 * reactionController.js
 * Handles: add/remove reactions (like, clap, insightful, save).
 * Unique index on (user, post, type) prevents duplicates.
 */
import Reaction from '../models/reactionModel.js';
import FeedPost from '../models/feedPostModel.js';
import { logActivity } from '../services/feedActivityService.js';

// Map reaction type to the stats field in FeedPost
const STAT_FIELD = {
  like: 'stats.likes',
  clap: 'stats.claps',
  insightful: 'stats.insightful',
  save: 'stats.saves',
  dislike: 'stats.dislikes',
};

/** POST /api/reaction — toggle a reaction on a post */
export const toggleReaction = async (req, res) => {
  try {
    const { postId, type } = req.body;
    if (!postId || !type) {
      return res.status(400).json({ success: false, message: 'postId and type are required' });
    }

    const userId = req.dbUser._id;
    const statField = STAT_FIELD[type];
    if (!statField) {
      return res.status(400).json({ success: false, message: `Invalid reaction type: ${type}` });
    }

    const existing = await Reaction.findOne({ user: userId, post: postId, type });

    if (existing) {
      // Remove local reaction
      await existing.deleteOne();
      await FeedPost.findByIdAndUpdate(postId, { $inc: { [statField]: -1 } });
      return res.json({ success: true, reacted: false, type });
    }

    // Handle mutual exclusivity for like/dislike
    if (type === 'like' || type === 'dislike') {
      const opposingType = type === 'like' ? 'dislike' : 'like';
      const opposingReaction = await Reaction.findOne({ user: userId, post: postId, type: opposingType });
      
      if (opposingReaction) {
        // Remove the opposing reaction first
        await opposingReaction.deleteOne();
        await FeedPost.findByIdAndUpdate(postId, { $inc: { [STAT_FIELD[opposingType]]: -1 } });
      }
    }

    // Add new reaction
    await Reaction.create({ user: userId, post: postId, type });
    await FeedPost.findByIdAndUpdate(postId, { $inc: { [statField]: 1 } });

    // Log for feed ranking (non-blocking)
    logActivity(postId, userId, type);

    res.status(201).json({ success: true, reacted: true, type });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Already reacted with this type' });
    }
    console.error('toggleReaction error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** GET /api/reaction/post/:postId — get user's reactions on a post */
export const getUserReactions = async (req, res) => {
  try {
    const reactions = await Reaction.find({
      user: req.dbUser._id,
      post: req.params.postId,
    }).select('type').lean();

    const reacted = reactions.map((r) => r.type);
    res.json({ success: true, data: reacted });
  } catch (err) {
    console.error('getUserReactions error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
