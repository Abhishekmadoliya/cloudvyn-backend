/**
 * feedService.js
 * Business logic for retrieving personalized and ranked feed posts.
 */
import FeedPost from '../models/feedPostModel.js';

const DEFAULT_PAGE_SIZE = 15;

/**
 * Get a ranked/personalized feed.
 * @param {object} opts
 * @param {string[]|null} opts.interests - User interests for topic filtering
 * @param {string[]|null} opts.followedPersonas - Persona IDs user follows
 * @param {string|null} opts.category - Filter by category
 * @param {string|null} opts.tag - Filter by tag
 * @param {string|null} opts.topic - Filter by topic
 * @param {number} opts.page - Pagination page (1-based)
 * @param {number} opts.limit - Items per page
 * @returns {Promise<{posts: object[], total: number, page: number, pages: number}>}
 */
export const getPersonalizedFeed = async ({
  interests = null,
  followedPersonas = null,
  category = null,
  tag = null,
  topic = null,
  tab = null,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
}) => {
  const query = { status: 'published' };

  // Interest-based category boost (optional filter)
  if (category) {
    query.category = { $regex: new RegExp(category, 'i') };
  }

  if (tag) {
    query.tags = { $in: [tag] };
  }

  if (topic) {
    query.topic = { $regex: new RegExp(topic, 'i') };
  }

  // Handle specific tabs
  let sort = { rankingScore: -1, createdAt: -1 };

  if (tab === 'following') {
    // Only show posts from personas the user follows
    if (followedPersonas && followedPersonas.length > 0) {
      query.authorPersona = { $in: followedPersonas };
    } else {
      // If not following anyone, return empty or a fallback
      // We'll return empty so the frontend shows the empty state correctly
      return { posts: [], total: 0, page, pages: 0 };
    }
  } else if (tab === 'trending') {
    // Trending: Sort strictly by engagement metrics rather than personalized time-decay score
    // To simplify without aggregations: sort by rankingScore, but without interest matching
    sort = { rankingScore: -1 };
  } else if (tab === 'discussions') {
    // Discussions: Show explicit debate threads or posts with high comment volume
    query.$or = [{ isDebate: true }, { 'stats.comments': { $gt: 0 } }];
    sort = { 'stats.comments': -1, createdAt: -1 };
  } else {
    // For You: Default personalized score-based sorting (time-decay applied in DB/cron)
    // Could boost authors that match `interests` here if aggregation was used, 
    // but for now rankingScore already handles base quality.
    sort = { rankingScore: -1, createdAt: -1 };
  }

  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    FeedPost.find(query)
      .populate('authorPersona', 'name username avatar expertise credibilityScore')
      .populate('sourceRefs', 'title url publisher reliabilityScore')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    FeedPost.countDocuments(query),
  ]);

  return { posts, total, page, pages: Math.ceil(total / limit) };
};

/**
 * Get debate thread: post + its replies.
 */
export const getDebateThread = async (rootPostId) => {
  const [root, replies] = await Promise.all([
    FeedPost.findById(rootPostId)
      .populate('authorPersona', 'name username avatar expertise credibilityScore')
      .lean(),
    FeedPost.find({ parentPost: rootPostId, status: 'published' })
      .populate('authorPersona', 'name username avatar expertise credibilityScore')
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return { root, replies };
};
