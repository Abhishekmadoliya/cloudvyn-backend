import { Worker } from "bullmq";
import redisConnection from "../../config/redis.js";
import { conductSerpResearch } from "../../services/blog/serpResearchService.js";
import BlogJob from "../../models/blog/jobModel.js";
import { addBlogJob } from "../../queues/blogQueue.js";

/**
 * SERP Research Worker — Stage 3
 * Processes jobs with stage === 'serp'
 * Fetches top 10 SERP results → saves research_data → hands off to content stage
 */
const serpWorker = new Worker(
  "blog-pipeline",
  async (job) => {
    if (job.data.stage !== "serp") return; // Only process our stage

    const { postId, jobDocId, keyword } = job.data;

    console.log(`[Worker:SERP] Processing keyword: "${keyword}" for post: ${postId}`);

    // Mark job as running
    await BlogJob.findByIdAndUpdate(jobDocId, {
      status: "running",
      stage: "serp",
    });

    try {
      const researchData = await conductSerpResearch(keyword);

      // Save research data to job document — so content stage doesn't re-fetch
      await BlogJob.findByIdAndUpdate(jobDocId, {
        research_data: researchData,
        "stage_results.serp": researchData,
        status: "completed",
      });

      // Enqueue next stage: content generation
      await addBlogJob("content", {
        postId,
        jobDocId,
        keyword,
        researchData,
      });

      console.log(`[Worker:SERP] Done for "${keyword}" — enqueued content stage`);
    } catch (err) {
      await BlogJob.findByIdAndUpdate(jobDocId, {
        status: "failed",
        $push: { error_log: { stage: "serp", error: err.message } },
      });
      throw err; // BullMQ will handle retries
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

serpWorker.on("failed", (job, err) => {
  console.error(`[Worker:SERP] Job ${job?.id} failed: ${err.message}`);
});

export default serpWorker;
