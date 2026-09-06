import { Roadmap } from "../models/roadmapModel.js";

/**
 * Get all published roadmaps for the public listing page
 * Query params: category, difficulty, search, page, limit
 */
export const getAllRoadmaps = async (req, res) => {
  try {
    const { category, difficulty, search, page = 1, limit = 50 } = req.query;

    const filter = { status: "published" };

    if (category && category !== "All") {
      filter.category = category;
    }

    if (difficulty && difficulty !== "All") {
      filter.difficulty = difficulty;
    }

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch roadmaps with metadata (excluding heavy stages for listing performance)
    const roadmaps = await Roadmap.find(filter)
      .select("slug title category difficulty estimatedWeeks description icon topicCount isFeatured order updatedAt")
      .sort({ isFeatured: -1, order: 1, createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Roadmap.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: roadmaps,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching roadmaps:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch roadmaps",
      error: error.message,
    });
  }
};

/**
 * Get single published roadmap by slug with all stages, topics, and resources
 */
export const getRoadmapBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Roadmap slug is required",
      });
    }

    const roadmap = await Roadmap.findOne({
      slug: slug.toLowerCase().trim(),
      status: "published",
    }).lean();

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: `Roadmap with slug '${slug}' not found`,
      });
    }

    // Sort stages by order ascending
    if (roadmap.stages && Array.isArray(roadmap.stages)) {
      roadmap.stages.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    return res.status(200).json({
      success: true,
      data: roadmap,
    });
  } catch (error) {
    console.error("Error fetching roadmap by slug:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch roadmap details",
      error: error.message,
    });
  }
};

/**
 * Get all published roadmap slugs for sitemap generation and static routes
 */
export const getRoadmapSlugs = async (req, res) => {
  try {
    const slugs = await Roadmap.find({ status: "published" })
      .select("slug updatedAt")
      .lean();

    return res.status(200).json({
      success: true,
      data: slugs,
    });
  } catch (error) {
    console.error("Error fetching roadmap slugs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch roadmap slugs",
      error: error.message,
    });
  }
};
