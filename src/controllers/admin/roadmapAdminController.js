import { Roadmap } from "../../models/roadmapModel.js";

/**
 * Generate slug from string
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Get all roadmaps for admin panel with filters and pagination
 */
export const getAdminRoadmaps = async (req, res) => {
  try {
    const { status, category, difficulty, search, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (category && category !== "all" && category !== "All") {
      filter.category = category;
    }

    if (difficulty && difficulty !== "all" && difficulty !== "All") {
      filter.difficulty = difficulty;
    }

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { slug: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const roadmaps = await Roadmap.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
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
    console.error("Error in getAdminRoadmaps:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch roadmaps for admin",
      error: error.message,
    });
  }
};

/**
 * Get roadmap overview metrics and category breakdown
 */
export const getAdminRoadmapStats = async (req, res) => {
  try {
    const [totalRoadmaps, publishedCount, draftCount, allRoadmaps] = await Promise.all([
      Roadmap.countDocuments({}),
      Roadmap.countDocuments({ status: "published" }),
      Roadmap.countDocuments({ status: "draft" }),
      Roadmap.find({}).select("category stages topicCount").lean(),
    ]);

    let totalStages = 0;
    let totalTopics = 0;
    const categoryBreakdown = {};

    allRoadmaps.forEach((r) => {
      const cat = r.category || "Uncategorized";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

      if (r.stages && Array.isArray(r.stages)) {
        totalStages += r.stages.length;
      }
      totalTopics += r.topicCount || 0;
    });

    return res.status(200).json({
      success: true,
      data: {
        totalRoadmaps,
        publishedCount,
        draftCount,
        totalStages,
        totalTopics,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error("Error in getAdminRoadmapStats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch roadmap statistics",
      error: error.message,
    });
  }
};

/**
 * Get roadmap by ID for editing
 */
export const getAdminRoadmapById = async (req, res) => {
  try {
    const { id } = req.params;

    let roadmap = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      roadmap = await Roadmap.findById(id).lean();
    }
    if (!roadmap) {
      roadmap = await Roadmap.findOne({ slug: id.toLowerCase().trim() }).lean();
    }

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: roadmap,
    });
  } catch (error) {
    console.error("Error in getAdminRoadmapById:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch roadmap",
      error: error.message,
    });
  }
};

/**
 * Create a new roadmap
 */
export const createAdminRoadmap = async (req, res) => {
  try {
    const {
      title,
      slug,
      category,
      difficulty,
      estimatedWeeks,
      description,
      icon,
      stages,
      status,
      isFeatured,
      order,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const finalSlug = (slug ? generateSlug(slug) : generateSlug(title)).trim();

    if (!finalSlug) {
      return res.status(400).json({
        success: false,
        message: "Valid slug is required",
      });
    }

    // Check slug uniqueness
    const existing = await Roadmap.findOne({ slug: finalSlug });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Roadmap with slug '${finalSlug}' already exists. Please choose a different slug or title.`,
      });
    }

    const parsedStages = Array.isArray(stages) ? stages : [];
    const topicCount = parsedStages.reduce((acc, st) => {
      return acc + (st.topics && Array.isArray(st.topics) ? st.topics.length : 0);
    }, 0);

    const newRoadmap = new Roadmap({
      title: title.trim(),
      slug: finalSlug,
      category: category ? category.trim() : "Web Dev",
      difficulty: difficulty || "Intermediate",
      estimatedWeeks: Number(estimatedWeeks) || 4,
      description:
        (description && description.trim()) ||
        `Comprehensive ${title.trim()} developer learning roadmap and step-by-step career path guide.`,
      icon: icon ? icon.trim() : "Layers",

      stages: parsedStages,
      topicCount,
      status: status || "published",
      isFeatured: !!isFeatured,
      order: Number(order) || 0,
    });

    const savedRoadmap = await newRoadmap.save();

    return res.status(201).json({
      success: true,
      message: "Roadmap created successfully",
      data: savedRoadmap,
    });
  } catch (error) {
    console.error("Error in createAdminRoadmap:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create roadmap",
      error: error.message,
    });
  }
};

/**
 * Update an existing roadmap
 */
export const updateAdminRoadmap = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      category,
      difficulty,
      estimatedWeeks,
      description,
      icon,
      stages,
      status,
      isFeatured,
      order,
    } = req.body;

    let roadmap = await Roadmap.findById(id);
    if (!roadmap) {
      roadmap = await Roadmap.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    if (slug) {
      const formattedSlug = generateSlug(slug);
      if (formattedSlug !== roadmap.slug) {
        const slugExists = await Roadmap.findOne({ slug: formattedSlug, _id: { $ne: roadmap._id } });
        if (slugExists) {
          return res.status(409).json({
            success: false,
            message: `Roadmap with slug '${formattedSlug}' already exists.`,
          });
        }
        roadmap.slug = formattedSlug;
      }
    }

    if (title !== undefined) roadmap.title = title.trim();
    if (category !== undefined) roadmap.category = category.trim();
    if (difficulty !== undefined) roadmap.difficulty = difficulty;
    if (estimatedWeeks !== undefined) roadmap.estimatedWeeks = Number(estimatedWeeks);
    if (description !== undefined) roadmap.description = description.trim();
    if (icon !== undefined) roadmap.icon = icon.trim();
    if (status !== undefined) roadmap.status = status;
    if (isFeatured !== undefined) roadmap.isFeatured = !!isFeatured;
    if (order !== undefined) roadmap.order = Number(order);

    if (stages !== undefined && Array.isArray(stages)) {
      roadmap.stages = stages;
      roadmap.topicCount = stages.reduce((acc, st) => {
        return acc + (st.topics && Array.isArray(st.topics) ? st.topics.length : 0);
      }, 0);
    }

    const updated = await roadmap.save();

    return res.status(200).json({
      success: true,
      message: "Roadmap updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error in updateAdminRoadmap:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update roadmap",
      error: error.message,
    });
  }
};

/**
 * Toggle roadmap status between published and draft
 */
export const toggleAdminRoadmapStatus = async (req, res) => {
  try {
    const { id } = req.params;

    let roadmap = await Roadmap.findById(id);
    if (!roadmap) {
      roadmap = await Roadmap.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    roadmap.status = roadmap.status === "published" ? "draft" : "published";
    await roadmap.save();

    return res.status(200).json({
      success: true,
      message: `Roadmap status changed to ${roadmap.status}`,
      data: {
        _id: roadmap._id,
        slug: roadmap.slug,
        status: roadmap.status,
      },
    });
  } catch (error) {
    console.error("Error in toggleAdminRoadmapStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle roadmap status",
      error: error.message,
    });
  }
};

/**
 * Delete a roadmap
 */
export const deleteAdminRoadmap = async (req, res) => {
  try {
    const { id } = req.params;

    let roadmap = await Roadmap.findById(id);
    if (!roadmap) {
      roadmap = await Roadmap.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    await Roadmap.findByIdAndDelete(roadmap._id);

    return res.status(200).json({
      success: true,
      message: `Roadmap '${roadmap.title}' deleted successfully`,
    });
  } catch (error) {
    console.error("Error in deleteAdminRoadmap:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete roadmap",
      error: error.message,
    });
  }
};
