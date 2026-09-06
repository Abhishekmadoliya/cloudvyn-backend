import { Worker } from "bullmq";
import redisConnection from "../../config/redis.js";
import { checkPlagiarismAndAI } from "../../services/blog/plagiarismService.js";
import BlogPost from "../../models/blogModel.js";
import BlogJob from "../../models/blog/jobModel.js";
import RetryLog from "../../models/blog/retryLogModel.js";
import { addBlogJob } from "../../queues/blogQueue.js";

const MAX_CONTENT_RETRIES = 2;

/**
 * Plagiarism & AI Detection Worker — Stage 6
 *
 * Runs Originality.ai check. If scores exceed threshold AND retry count
 * is below MAX_CONTENT_RETRIES → re-enqueue content stage with a "new angle" hint.
 * Otherwise, advances to pending_review status.
 */
const plagiarismWorker = new Worker(
  "blog-pipeline",
  async (job) => {
    if (job.data.stage !== "plagiarism") return;

    const { postId, jobDocId, keyword, title, content } = job.data;

    console.log(`[Worker:Plagiarism] Checking: "${title}"`);

    await BlogJob.findByIdAndUpdate(jobDocId, {
      status: "running",
      stage: "plagiarism",
    });

    try {
      const result = await checkPlagiarismAndAI(content, title);

      // Update post scores
      await BlogPost.findByIdAndUpdate(postId, {
        plagiarism_score: result.plagiarism_score,
        ai_score: result.ai_score,
      });

      await BlogJob.findByIdAndUpdate(jobDocId, {
        "stage_results.plagiarism": result,
        status: "completed",
      });

      // Check if scores are bad and retry budget remains
      const post = await BlogPost.findById(postId, {
        content_retry_count: 1,
        keyword_id: 1,
      }).lean();

      if (result.shouldRetry && post.content_retry_count < MAX_CONTENT_RETRIES) {
        const reason = `Plagiarism: ${result.plagiarism_score}%, AI: ${result.ai_score}%`;
        console.warn(`[Worker:Plagiarism] Retry needed. ${reason}`);

        // Log the retry
        await RetryLog.create({
          post_id: postId,
          stage: "plagiarism",
          attempt: post.content_retry_count + 1,
          reason,
          metadata: result,
        });

        // Fetch research data for re-generation
        const jobDoc = await BlogJob.findById(jobDocId, { research_data: 1 }).lean();

        // Re-enqueue content stage with rejection notes
        await addBlogJob("content", {
          postId,
          jobDocId,
          keyword,
          researchData: jobDoc.research_data,
          rejectionNotes: `${reason}. Write from a completely different angle with more human-sounding prose.`,
        });

        await BlogPost.findByIdAndUpdate(postId, { status: "draft" });
      } else {
        // All good — mark as pending review
        await BlogPost.findByIdAndUpdate(postId, { status: "pending_review" });
        console.log(`[Worker:Plagiarism] Passed. Status → pending_review`);

        // Option: skip manual review → go straight to SEO
        // Uncomment below if you don't want manual approval step:
        // await addBlogJob("seo", { postId, jobDocId, keyword });
      }
    } catch (err) {
      await BlogJob.findByIdAndUpdate(jobDocId, {
        status: "failed",
        $push: { error_log: { stage: "plagiarism", error: err.message } },
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

plagiarismWorker.on("failed", (job, err) => {
  console.error(`[Worker:Plagiarism] Job ${job?.id} failed: ${err.message}`);
});

export default plagiarismWorker;
