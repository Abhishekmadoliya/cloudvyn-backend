import { Worker } from "bullmq";
import redisConnection from "../../config/redis.js";
import { submitForIndexing } from "../../services/blog/indexingService.js";
import BlogPost from "../../models/blogModel.js";
import BlogJob from "../../models/blog/jobModel.js";

/**
 * Indexing Worker — Stage 11
 * Pings Google Indexing API + IndexNow after WordPress publish.
 * This is the final stage of the per-post pipeline.
 */
const indexingWorker = new Worker(
  "blog-pipeline",
  async (job) => {
    if (job.data.stage !== "indexing") return;

    const { postId, jobDocId, wp_url } = job.data;

    console.log(`[Worker:Indexing] Submitting: ${wp_url}`);

    await BlogJob.findByIdAndUpdate(jobDocId, {
      status: "running",
      stage: "indexing",
    });

    try {
      const result = await submitForIndexing(wp_url);

      const now = new Date();

      await BlogPost.findByIdAndUpdate(postId, {
        indexed_at: now,
      });

      await BlogJob.findByIdAndUpdate(jobDocId, {
        "stage_results.indexing": result,
        status: "completed",
        completed_at: now,
      });

      console.log(
        `[Worker:Indexing] Done — Google: ${result.google}, IndexNow: ${result.indexNow}`
      );
    } catch (err) {
      await BlogJob.findByIdAndUpdate(jobDocId, {
        status: "failed",
        $push: { error_log: { stage: "indexing", error: err.message } },
      });
      // Don't fail the post — it's already published; indexing is best-effort
      console.error(`[Worker:Indexing] Non-critical failure: ${err.message}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

indexingWorker.on("failed", (job, err) => {
  console.error(`[Worker:Indexing] Job ${job?.id} failed: ${err.message}`);
});

export default indexingWorker;
