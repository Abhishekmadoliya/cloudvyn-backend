import { Worker } from "bullmq";
import redisConnection from "../../config/redis.js";
import { generateCoverImage } from "../../services/blog/imageGeneratorService.js";
import BlogPost from "../../models/blogModel.js";
import BlogJob from "../../models/blog/jobModel.js";
import { addBlogJob } from "../../queues/blogQueue.js";

/**
 * Image Generator Worker — Stage 5
 * Generates cover image via Imagen 3, adds text overlay, uploads to GCS.
 * Saves GCS URL to post → enqueues plagiarism stage.
 */
const imageWorker = new Worker(
  "blog-pipeline",
  async (job) => {
    if (job.data.stage !== "image") return;

    const { postId, jobDocId, keyword, title } = job.data;

    console.log(`[Worker:Image] Generating cover for: "${title}"`);

    await BlogJob.findByIdAndUpdate(jobDocId, {
      status: "running",
      stage: "image",
    });

    try {
      const coverUrl = await generateCoverImage(postId, keyword, title);

      await BlogPost.findByIdAndUpdate(postId, {
        cover_image_url: coverUrl,
        image: coverUrl, // also set the original image field
      });

      await BlogJob.findByIdAndUpdate(jobDocId, {
        "stage_results.image": { cover_image_url: coverUrl },
        status: "completed",
      });

      // Fetch the post content for plagiarism check
      const post = await BlogPost.findById(postId, { content: 1, title: 1 }).lean();

      // Next: plagiarism check
      await addBlogJob("plagiarism", {
        postId,
        jobDocId,
        keyword,
        title: post.title,
        content: post.content,
      });

      console.log(`[Worker:Image] Cover uploaded: ${coverUrl}`);
    } catch (err) {
      await BlogJob.findByIdAndUpdate(jobDocId, {
        status: "failed",
        $push: { error_log: { stage: "image", error: err.message } },
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

imageWorker.on("failed", (job, err) => {
  console.error(`[Worker:Image] Job ${job?.id} failed: ${err.message}`);
});

export default imageWorker;
