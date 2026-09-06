/**
 * topicController.js
 * Handles: list trending topics, get posts by topic.
 */
import Topic from '../models/topicModel.js';
import FeedPost from '../models/feedPostModel.js';

/** GET /api/topic — list trending topics */
export const getTrendingTopics = async (req, res) => {
  try {
    const { limit = 20, category } = req.query;
    const query = {};
    if (category) query.category = category;

    const topics = await Topic.find(query)
      .sort({ popularityScore: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: topics });
  } catch (err) {
    console.error('getTrendingTopics error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** GET /api/topic/:slug/posts — get posts tagged with a topic */
export const getTopicPosts = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [posts, total] = await Promise.all([
      FeedPost.find({ topic: req.params.slug, status: 'published' })
        .populate('authorPersona', 'name username avatar credibilityScore')
        .sort({ rankingScore: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FeedPost.countDocuments({ topic: req.params.slug, status: 'published' }),
    ]);

    res.json({ success: true, data: posts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('getTopicPosts error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Admin ────────────────────────────────────────────────────────────── */

/** POST /api/admin/feed/topic — create topic */
export const createTopic = async (req, res) => {
  try {
    const topic = await Topic.create(req.body);
    res.status(201).json({ success: true, data: topic });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Topic already exists' });
    console.error('createTopic error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** PUT /api/admin/feed/topic/:id — update topic */
export const updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });
    res.json({ success: true, data: topic });
  } catch (err) {
    console.error('updateTopic error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** DELETE /api/admin/feed/topic/:id */
export const deleteTopic = async (req, res) => {
  try {
    await Topic.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Topic deleted' });
  } catch (err) {
    console.error('deleteTopic error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
