/**
 * feedPostController.js
 * Handles: feed retrieval, single post, explain (ELI15), debate threads,
 * and admin CRUD.
 */
import FeedPost from '../models/feedPostModel.js';
import { getPersonalizedFeed, getDebateThread } from '../services/feedService.js';
import { logActivity } from '../services/feedActivityService.js';
import { generateAndSavePost } from '../services/personaService.js';
import { generateSlug } from '../utils/slugify.js';
import mongoose from 'mongoose';

/** GET /api/feed — ranked & personalized feed */
export const getFeed = async (req, res) => {
  try {
    const { category, tag, topic, tab, page = 1, limit = 15 } = req.query;

    // Personalization: use user interests & followed personas if logged in
    const interests = req.dbUser?.interestedIn || null;
    const followedPersonas = req.dbUser?.followedPersonas || null;

    const result = await getPersonalizedFeed({
      interests,
      followedPersonas,
      category,
      tag,
      topic,
      tab,
      page: Number(page),
      limit: Math.min(Number(limit), 50),
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('getFeed error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** GET /api/feed/post/:id — single post detail + log view */
export const getPost = async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(idOrSlug) 
      ? { _id: idOrSlug } 
      : { slug: idOrSlug };

    const post = await FeedPost.findOne(query)
      .populate('authorPersona', 'name username avatar expertise credibilityScore tone')
      .populate('sourceRefs', 'title url publisher reliabilityScore publishedAt')
      .lean();

    if (!post || post.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Increment view count and log activity (non-blocking)
    FeedPost.updateOne(query, { $inc: { 'stats.views': 1 } }).exec();
    logActivity(post._id, req.dbUser?._id || null, 'view');

    res.json({ success: true, data: post });
  } catch (err) {
    console.error('getPost error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** GET /api/feed/post/:id/debate — debate thread (root + replies) */
export const getDebate = async (req, res) => {
  try {
    const thread = await getDebateThread(req.params.id);
    if (!thread.root) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: thread });
  } catch (err) {
    console.error('getDebate error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** GET /api/feed/post/:id/explain — ELI15: simple explanation of post */
export const explainPost = async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.id).select('content summary topic').lean();
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // ── LLM CALL PLACEHOLDER ──────────────────────────────────────────────
    // const explanation = await callLLM(`Explain this in simple terms for a 15-year-old:\n\n${post.content}`);
    const explanation = `[ELI15 PLACEHOLDER] Simple explanation of: "${post.summary || post.content?.slice(0, 100)}..." — wire up your LLM here.`;
    // ─────────────────────────────────────────────────────────────────────

    res.json({ success: true, data: { postId: req.params.id, explanation } });
  } catch (err) {
    console.error('explainPost error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Admin controllers ───────────────────────────────────────────────── */

/** GET /api/admin/feed/post/all — list all posts (any status) */
export const adminListPosts = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [posts, total] = await Promise.all([
      FeedPost.find(query)
        .populate('authorPersona', 'name username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FeedPost.countDocuments(query),
    ]);

    res.json({ success: true, data: posts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('adminListPosts error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /api/admin/feed/post — manually create a post */
export const adminCreatePost = async (req, res) => {
  try {
    const postData = { ...req.body };
    if (!postData.slug && postData.headline) {
      postData.slug = generateSlug(postData.headline);
    }
    const post = await FeedPost.create(postData);
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    console.error('adminCreatePost error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /api/admin/feed/post/generate — LLM-generate a post for a persona */
export const adminGeneratePost = async (req, res) => {
  try {
    const { personaId, topic, postType, tags, category, sourceRefs } = req.body;
    if (!personaId || !topic) {
      return res.status(400).json({ success: false, message: 'personaId and topic are required' });
    }
    const post = await generateAndSavePost({ personaId, topic, postType, tags, category, sourceRefs });
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    console.error('adminGeneratePost error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/admin/feed/post/:id — update/edit post */
export const adminUpdatePost = async (req, res) => {
  try {
    const post = await FeedPost.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (err) {
    console.error('adminUpdatePost error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** PATCH /api/admin/feed/post/:id/status — change post status */
export const adminSetPostStatus = async (req, res) => {
  try {
    const { status, flagReason } = req.body;
    const update = { status };
    if (flagReason) update.flagReason = flagReason;

    const post = await FeedPost.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (err) {
    console.error('adminSetPostStatus error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** DELETE /api/admin/feed/post/:id — delete post */
export const adminDeletePost = async (req, res) => {
  try {
    await FeedPost.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('adminDeletePost error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** GET /api/feed/all-post-slugs — fetch all slugs for sitemap generation */
export const getAllPostSlugs = async (req, res) => {
  try {
    const posts = await FeedPost.find({ status: 'published' })
      .select('slug updatedAt')
      .lean();
    res.json({ success: true, data: posts });
  } catch (err) {
    console.error('getAllPostSlugs error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
