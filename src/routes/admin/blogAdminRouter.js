import express from "express";
import { requireAdminAuth } from "../../middleware/requireAuth.js";
import blogModel from "../../models/blogModel.js";

const blogAdminRouter = express.Router();

// Apply admin authentication middleware
blogAdminRouter.use(requireAdminAuth);

/**
 * GET /api/admin/blogs/stats
 * Aggregate blog performance & status metrics for admin dashboard
 */
blogAdminRouter.get("/stats", async (req, res) => {
  try {
    const totalBlogs = await blogModel.countDocuments({});
    const publishedCount = await blogModel.countDocuments({ status: "published" });
    const draftCount = await blogModel.countDocuments({ status: "draft" });
    const pendingReviewCount = await blogModel.countDocuments({ status: "pending_review" });
    const automatedCount = await blogModel.countDocuments({ is_automated: true });

    // Category distribution
    const categoryStats = await blogModel.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    // Average AI score for automated articles
    const aiScoreAggregate = await blogModel.aggregate([
      { $match: { ai_score: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: "$ai_score" } } }
    ]);
    const avgAiScore = Math.round(aiScoreAggregate[0]?.avgScore || 85);

    return res.status(200).json({
      success: true,
      data: {
        totalBlogs,
        publishedCount,
        draftCount,
        pendingReviewCount,
        automatedCount,
        avgAiScore,
        categoryStats,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/blogs/stats:", error);
    return res.status(500).json({ success: false, message: "Server error fetching blog stats" });
  }
});

/**
 * GET /api/admin/blogs/all
 * List all blog posts with sorting
 */
blogAdminRouter.get("/all", async (req, res) => {
  try {
    const blogs = await blogModel.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "Fetched all blogs",
      data: blogs,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/blogs/all:", error);
    return res.status(500).json({ success: false, message: "Server error fetching blogs" });
  }
});

/**
 * POST /api/admin/blogs/create
 * Create a new blog post
 */
blogAdminRouter.post("/create", async (req, res) => {
  try {
    const { title, content, author, tags, slug, category, image, status } = req.body;
    if (!title || !content || !slug) {
      return res.status(400).json({
        success: false,
        message: "Title, content, and slug are required.",
      });
    }

    const newBlog = new blogModel({
      title,
      content,
      author: author || "Cloudvyn Admin",
      tags: tags || [],
      slug,
      category: category || "General",
      image: image || null,
      status: status || "published",
    });

    await newBlog.save();
    return res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: newBlog,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/blogs/create:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error creating blog" });
  }
});

/**
 * PUT /api/admin/blogs/update/:id
 * Update blog post by ID or slug
 */
blogAdminRouter.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const blog = await blogModel.findOneAndUpdate(
      { $or: [{ _id: id }, { slug: id }] },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error in PUT /api/admin/blogs/update:", error);
    return res.status(500).json({ success: false, message: "Server error updating blog" });
  }
});

/**
 * DELETE /api/admin/blogs/delete/:id
 * Delete blog post
 */
blogAdminRouter.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await blogModel.findOneAndDelete({ $or: [{ _id: id }, { slug: id }] });

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/blogs/delete:", error);
    return res.status(500).json({ success: false, message: "Server error deleting blog" });
  }
});

export default blogAdminRouter;
