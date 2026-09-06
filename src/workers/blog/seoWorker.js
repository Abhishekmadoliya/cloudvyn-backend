import { Worker } from "bullmq";
import redisConnection from "../../config/redis.js";
import { finalizeSeoMeta } from "../../services/blog/seoFinalizerService.js";
import BlogPost from "../../models/blogModel.js";
import BlogJob from "../../models/blog/jobModel.js";
import { addBlogJob } from "../../queues/blogQueue.js";

/**
 * SEO Finalizer Worker — Stage 9
 * Triggered after manual approval (or auto-approval if review is skipped).
 * Calls Gemini to generate all SEO metadata → enqueues publish stage.
 */
const seoWorker = new Worker(
  "blog-pipeline",
  async (job) => {
    if (job.data.stage !== "seo") return;

    const { postId, jobDocId, keyword } = job.data;

    console.log(`[Worker:SEO] Finalizing SEO for post: ${postId}`);

    await BlogJob.findByIdAndUpdate(jobDocId, {
      status: "running",
      stage: "seo",
    });

    try {
      // Fetch full post document for SEO finalization
      const post = await BlogPost.findById(postId).lean();
      if (!post) throw new Error(`Post ${postId} not found`);

      const seoMeta = await finalizeSeoMeta(post);

      await BlogPost.findByIdAndUpdate(postId, {
        seo_meta: seoMeta,
        status: "approved", // Ensure it's marked approved before publish
      });

      await BlogJob.findByIdAndUpdate(jobDocId, {
        "stage_results.seo": seoMeta,
        status: "completed",
      });

      // Next: publish to WordPress
      await addBlogJob("publish", { postId, jobDocId, keyword });

      console.log(`[Worker:SEO] SEO metadata saved — canonical: ${seoMeta.canonical_url}`);
    } catch (err) {
      await BlogJob.findByIdAndUpdate(jobDocId, {
        status: "failed",
        $push: { error_log: { stage: "seo", error: err.message } },
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

seoWorker.on("failed", (job, err) => {
  console.error(`[Worker:SEO] Job ${job?.id} failed: ${err.message}`);
});

export default seoWorker;
