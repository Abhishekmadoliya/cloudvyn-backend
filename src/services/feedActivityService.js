/**
 * feedActivityService.js
 * Logs user actions and recalculates the ranking score for posts.
 *
 * Ranking formula weights:
 *   views:      0.1
 *   likes:      1.5
 *   claps:      1.5
 *   insightful: 2.0
 *   comments:   3.0
 *   saves:      2.5
 *   shares:     2.0
 *   recency:    time-decay factor
 */
import FeedActivity from '../models/feedActivityModel.js';
import FeedPost from '../models/feedPostModel.js';

/** Weight map for engagement types */
const WEIGHTS = {
  view: 0.1,
  like: 1.5,
  clap: 1.5,
  insightful: 2.0,
  comment: 3.0,
  save: 2.5,
  share: 2.0,
};

/**
 * Log an activity event and update the post's ranking score.
 * @param {string} postId - Post ObjectId string
 * @param {string|null} userId - User ObjectId string (null for anonymous views)
 * @param {string} action - One of WEIGHTS keys
 */
export const logActivity = async (postId, userId, action) => {
  try {
    // Log the activity event
    await FeedActivity.create({ post: postId, user: userId || null, action });

    // Recompute ranking score
    await recalculateRankingScore(postId);
  } catch (err) {
    // Non-fatal — don't crash the main request
    console.error('logActivity error:', err.message);
  }
};

/**
 * Recalculate and persist ranking score for a post.
 * Uses engagement counts + time-decay.
 */
export const recalculateRankingScore = async (postId) => {
  const post = await FeedPost.findById(postId).select('stats createdAt');
  if (!post) return;

  const { stats, createdAt } = post;

  // Time decay: score halves every 24 hours
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const decayFactor = Math.pow(0.5, ageHours / 24);

  const rawScore =
    (stats.views || 0) * WEIGHTS.view +
    (stats.likes || 0) * WEIGHTS.like +
    (stats.claps || 0) * WEIGHTS.clap +
    (stats.insightful || 0) * WEIGHTS.insightful +
    (stats.comments || 0) * WEIGHTS.comment +
    (stats.saves || 0) * WEIGHTS.save +
    (stats.shares || 0) * WEIGHTS.share;

  const rankingScore = parseFloat((rawScore * decayFactor).toFixed(4));

  await FeedPost.findByIdAndUpdate(postId, { rankingScore });
};
