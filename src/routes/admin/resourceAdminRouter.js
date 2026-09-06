import express from "express";
import multer from "multer";
import Resource from "../../models/resourceModel.js";
import { uploadResumeToCloudinary } from "../../config/cloudinary.js";

const resourceAdminRouter = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

/**
 * POST /api/admin/resources/upload
 * Upload a PDF or file to Cloudinary for resources
 */
resourceAdminRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const uploadResult = await uploadResumeToCloudinary(
      req.file.buffer,
      req.file.originalname,
      "resources"
    );

    res.json({
      success: true,
      url: uploadResult.url,
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      fileType: req.file.mimetype.includes("pdf") ? "pdf" : "doc",
    });
  } catch (error) {
    console.error("Admin resource upload error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to upload file" });
  }
});

/**
 * GET /api/admin/resources
 * Get all resources with filtering and pagination for admin
 */
resourceAdminRouter.get("/", async (req, res) => {
  try {
    const { category, type, search } = req.query;
    const query = {};

    if (category && category !== "All") query.category = category;
    if (type && type !== "all") query.resourceType = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const resources = await Resource.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      resources,
    });
  } catch (error) {
    console.error("GET /api/admin/resources error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/resources
 * Create a new resource (file, link, or article)
 */
resourceAdminRouter.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      resourceType,
      fileUrl,
      fileType,
      fileSize,
      content,
      readTime,
      tags,
      targetTier,
      isPublished,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (resourceType === "article" && !content) {
      return res.status(400).json({ success: false, message: "Content is required for article type" });
    }

    if ((resourceType === "file" || resourceType === "link") && !fileUrl) {
      return res.status(400).json({ success: false, message: "File URL or Link is required" });
    }

    const newResource = await Resource.create({
      title,
      description,
      category: category || "General",
      resourceType: resourceType || "file",
      fileUrl,
      fileType: fileType || (resourceType === "article" ? "article" : "pdf"),
      fileSize,
      content,
      readTime: readTime || "5 min read",
      tags: Array.isArray(tags) ? tags : (typeof tags === "string" ? tags.split(",").map(t => t.trim()) : []),
      targetTier: targetTier || ["plus", "pro"],
      isPublished: isPublished !== undefined ? isPublished : true,
      createdBy: req.dbUser?._id,
    });

    res.status(201).json({
      success: true,
      message: "Resource created successfully",
      resource: newResource,
    });
  } catch (error) {
    console.error("POST /api/admin/resources error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/admin/resources/:id
 * Update resource
 */
resourceAdminRouter.put("/:id", async (req, res) => {
  try {
    const updated = await Resource.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    res.json({
      success: true,
      message: "Resource updated successfully",
      resource: updated,
    });
  } catch (error) {
    console.error("PUT /api/admin/resources/:id error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/admin/resources/:id
 * Delete resource
 */
resourceAdminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await Resource.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    res.json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/admin/resources/:id error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default resourceAdminRouter;
