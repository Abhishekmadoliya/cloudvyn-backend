import e from "express";
import blogModel from "../models/blogModel.js";


export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    console.log("Fetching blog with slug:", slug);

    const blog = await blogModel.findOne({ slug: slug });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found with this slug",
      });
    }

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog by slug:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching blog",
    });
  }
};


export const addBlog = async (req, res) => {
  try {
    const { title, content, author, tags, slug, category, image } = req.body;
    console.log("body",req.body);
    
    if ((!title || !content || !author || !category, !slug)) {
      return res.status(400).json({
        success: false,
        message: "Title, content, author, and category are required fields.",
      });
    }
    const newBlog = await blogModel({
      title,
      content,
      author,
      tags,
      slug,
      category,
      image,
    });

    await newBlog.save();

    return res.status(200).json({ message: "new blog createdd" }, newBlog);
  } catch (error) {
    console.log("error in newblog controller", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

export const getAllBlog = async (req, res) => {
  try {
    const blogs = await blogModel.find({});

    if (blogs.length > 0) {
      res.status(200).json({ message: "all blogs fetched", data: blogs });
    } else {
      res.status(402).json({ message: "no blogs found", data: [] });
    }
  } catch (error) {
    console.log("error in blog contriller all blogs find", error);
    return res.status(500).json({ message: "internal server error" });
  }
};

export const getTopBlogs = async (req, res) => {
  try {
    const topBlogs = await blogModel.find({}).sort({ views: -1 }).limit(3);

    if (topBlogs.length > 0) {
      res.status(200).json({ message: "top blogs fetched", data: topBlogs });
    } else {
      res.status(402).json({ message: "no blogs found", data: [] });
    }
  } catch (error) {
    console.log("error in blog contriller top blogs find", error);
    return res.status(500).json({ message: "internal server error" });
  }
};
