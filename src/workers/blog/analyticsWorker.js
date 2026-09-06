import { Worker } from "bullmq";
import redisConnection from "../../config/redis.js";
import { pullAndStoreAnalytics } from "../../services/blog/analyticsService.js";

/**
 * Analytics Worker — Stage 12 (Weekly Cron)
 *
 * Invoked by the weekly cron job (not triggered by the per-post pipeline).
 * Pulls GSC data for all published posts and updates analytics collection.
 */
const analyticsWorker = new Worker(
  "blog-pipeline",
  async (job) => {
    if (job.data.stage !== "analytics") return;

    console.log("[Worker:Analytics] Starting weekly GSC pull...");

    try {
      const result = await pullAndStoreAnalytics();
      console.log(
        `[Worker:Analytics] Complete — Updated: ${result.updated}, Errors: ${result.errors}`
      );
      return result;
    } catch (err) {
      console.error("[Worker:Analytics] Failed:", err.message);
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // One analytics job at a time
  }
);

analyticsWorker.on("failed", (job, err) => {
  console.error(`[Worker:Analytics] Job ${job?.id} failed: ${err.message}`);
});

export default analyticsWorker;
