import BlogPost from "../../models/blogModel.js";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * Publish Service — Stage 10
 *
 * Instead of WordPress, posts are published directly in MongoDB
 * and served by the custom Next.js frontend.
 *
 * Sets:
 *   - status → "published"
 *   - published_at → now
 *   - seo_meta.canonical_url → FRONTEND_URL/blog/<slug>
 *
 * Required .env:
 *   FRONTEND_URL — Base URL of your custom frontend (e.g. https://cloudvyn.com)
 *                  Used to build the canonical URL stored in seo_meta.
 */

/**
 * "Publish" a post — mark it live in MongoDB.
 * Returns the canonical URL for the indexing stage.
 *
 * @param {object} post - Full post document (lean)
 * @returns {Promise<{ canonical_url: string, post_id: string }>}
 */
export async function publishPost(post) {
  const frontendBase =
    (process.env.FRONTEND_URL || "https://cloudvyn.com").replace(/\/$/, "");

  const canonicalUrl = `${frontendBase}/blog/${post.slug}`;

  const now = new Date();

  await BlogPost.findByIdAndUpdate(post._id, {
    status: "published",
    published_at: now,
    // Write the canonical URL so the indexing stage and SEO meta are consistent
    "seo_meta.canonical_url": canonicalUrl,
    "seo_meta.og_image": post.seo_meta?.og_image || post.cover_image_url,
  });

  console.log(`[Publish] Post "${post.title}" published → ${canonicalUrl}`);

  return {
    canonical_url: canonicalUrl,
    post_id: post._id.toString(),
  };
}
