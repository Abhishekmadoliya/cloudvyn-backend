import express from 'express';
import { getAllPosts, getPostBySlug } from '../../controllers/blog/blogController.js';
import blogModel from '../../models/blogModel.js';

const blogRouter = express.Router();

blogRouter.get('/posts', getAllPosts);
blogRouter.get('/post/:slug', getPostBySlug);


blogRouter.post("/create", async (req, res) => {
    try {
        const { title, content, slug } = req.body;
        if (!title || !content || !slug) {
            return res.status(400).json({
                success: false,
                message: "Title, content, and slug are required.",
            });
        }

        // Support all fields provided by external CMS
        const newBlog = new blogModel({
            ...req.body,
            author: req.body.author || "Cloudvyn Admin",
            tags: req.body.tags || [],
            category: req.body.category || "General",
            status: req.body.status || "published",
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


blogRouter.put("/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        let updateOperation = { $set: updateData };

        // Maintain history of old slugs if slug is changed by CMS
        if (updateData.slug) {
            const existingBlog = await blogModel.findOne({ $or: [{ _id: id }, { slug: id }] });
            if (existingBlog && existingBlog.slug !== updateData.slug) {
                updateOperation.$addToSet = { oldSlugs: existingBlog.slug };
            }
        }

        const blog = await blogModel.findOneAndUpdate(
            { $or: [{ _id: id }, { slug: id }] },
            updateOperation,
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

export default blogRouter;
