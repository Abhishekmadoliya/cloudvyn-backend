import blogModel from "../../models/blogModel.js";

export async function getAllPosts(req, res) {
    try {
        const posts = await blogModel.find();
        if (!posts) {
            res.status(404).json({ message: "Posts not found" });
        }
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


export async function getPostBySlug(req, res) {
    try {
        const { slug } = req.params;
        console.log("slug", slug);
        const post = await blogModel.findOne({ slug: slug });
        console.log("post", post);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}