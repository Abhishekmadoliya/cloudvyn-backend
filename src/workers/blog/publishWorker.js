import { Worker } from "bullmq";
import redisConnection from "../../config/redis.js";
import { publishPost } from "../../services/blog/publishService.js";
import BlogPost from "../../models/blogModel.js";
import BlogJob from "../../models/blog/jobModel.js";
import Keyword from "../../models/blog/keywordModel.js";
import { addBlogJob } from "../../queues/blogQueue.js";

/**
 * Publish Worker — Stage 10
 *
 * Marks the post as "published" directly in MongoDB (no WordPress).
 * Sets published_at, builds canonical_url from FRONTEND_URL/blog/<slug>,
 * marks the keyword as published, then enqueues the indexing stage.
 */
const publishWorker = new Worker(
  "blog-pipeline",
  async (job) => {
    if (job.data.stage !== "publish") return;

    const { postId, jobDocId, keyword } = job.data;

    console.log(`[Worker:Publish] Publishing post to MongoDB: ${postId}`);

    await BlogJob.findByIdAndUpdate(jobDocId, {
      status: "running",
      stage: "publish",
    });

    try {
      const post = await BlogPost.findById(postId).lean();
      if (!post) throw new Error(`Post ${postId} not found`);

      const { canonical_url } = await publishPost(post);

      // Mark keyword as published
      if (post.keyword_id) {
        await Keyword.findByIdAndUpdate(post.keyword_id, {
          status: "published",
          post_id: postId,
        });
      }

      await BlogJob.findByIdAndUpdate(jobDocId, {
        "stage_results.publish": { canonical_url },
        status: "completed",
      });

      // Final stage: ping search engines for indexing
      await addBlogJob("indexing", {
        postId,
        jobDocId,
        keyword,
        wp_url: canonical_url, // field name kept for compatibility with indexing worker
      });

      console.log(`[Worker:Publish] Done — canonical: ${canonical_url}`);
    } catch (err) {
      await BlogJob.findByIdAndUpdate(jobDocId, {
        status: "failed",
        $push: { error_log: { stage: "publish", error: err.message } },
      });
      await BlogPost.findByIdAndUpdate(postId, { status: "failed" });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

publishWorker.on("failed", (job, err) => {
  console.error(`[Worker:Publish] Job ${job?.id} failed: ${err.message}`);
});

export default publishWorker;
