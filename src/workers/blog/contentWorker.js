import { Worker } from "bullmq";
import redisConnection from "../../config/redis.js";
import { generateBlogContent } from "../../services/blog/contentGeneratorService.js";
import BlogPost from "../../models/blogModel.js";
import BlogJob from "../../models/blog/jobModel.js";
import { addBlogJob } from "../../queues/blogQueue.js";

/**
 * Content Generator Worker — Stage 4
 * Processes jobs with stage === 'content'
 * Calls Gemini → writes article to posts collection → enqueues image stage
 */
const contentWorker = new Worker(
  "blog-pipeline",
  async (job) => {
    if (job.data.stage !== "content") return;

    const { postId, jobDocId, keyword, researchData, rejectionNotes } = job.data;

    console.log(`[Worker:Content] Generating article for: "${keyword}"`);

    await BlogJob.findByIdAndUpdate(jobDocId, {
      status: "running",
      stage: "content",
    });

    try {
      const generated = await generateBlogContent(keyword, researchData, rejectionNotes);

      // Check for slug uniqueness — append timestamp if collision
      let slug = generated.slug;
      const existing = await BlogPost.findOne({ slug, _id: { $ne: postId } });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      // Update post with generated content
      await BlogPost.findByIdAndUpdate(postId, {
        title: generated.title,
        content: generated.content,
        meta: generated.meta,
        slug,
        alt_titles: generated.alt_titles || [],
        faqs: generated.faqs || [],
        tags: generated.tags || [],
        category: generated.category,
        // Keep original content for retry comparison
        content_original: generated.content,
        status: "draft",
        $inc: { content_retry_count: rejectionNotes ? 1 : 0 },
      });

      await BlogJob.findByIdAndUpdate(jobDocId, {
        "stage_results.content": {
          title: generated.title,
          slug,
          wordCount: generated.content?.split(/\s+/).length || 0,
        },
        status: "completed",
      });

      // Next: image generation
      await addBlogJob("image", { postId, jobDocId, keyword, title: generated.title });

      console.log(`[Worker:Content] Article saved: "${generated.title}" (slug: ${slug})`);
    } catch (err) {
      await BlogJob.findByIdAndUpdate(jobDocId, {
        status: "failed",
        $push: { error_log: { stage: "content", error: err.message } },
      });
      await BlogPost.findByIdAndUpdate(postId, { status: "failed" });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Gemini has rate limits — single concurrent content job
  }
);

contentWorker.on("failed", (job, err) => {
  console.error(`[Worker:Content] Job ${job?.id} failed: ${err.message}`);
});

export default contentWorker;
