import { conductSerpResearch } from "./serperResearchService.js";
import { generateBlogContent } from "./contentGeneratorService.js";
import { generateCoverImage } from "./imageGeneratorService.js";
import { checkPlagiarismAndAI } from "./plagiarismService.js";
import { finalizeSeoMeta } from "./seoFinalizerService.js";
import { publishPost } from "./publishService.js";
import { submitForIndexing } from "./indexingService.js";
import BlogPost from "../../models/blogModel.js";
import BlogJob from "../../models/blog/jobModel.js";
import Keyword from "../../models/blog/keywordModel.js";
import RetryLog from "../../models/blog/retryLogModel.js";
import slugify from "slugify";

/**
 * Blog Pipeline Orchestrator
 *
 * Runs all 7 stages sequentially in-process — no Redis, no BullMQ needed.
 * Each stage writes its output to MongoDB before moving to the next,
 * so if Node crashes mid-pipeline, you can resume via POST /api/blog/resume/:id.
 *
 * Designed for: 1 blog/day via node-cron → perfectly sufficient.
 */

const MAX_CONTENT_RETRIES = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function updateJob(jobId, update) {
  return BlogJob.findByIdAndUpdate(jobId, update, { new: true });
}

async function updatePost(postId, update) {
  return BlogPost.findByIdAndUpdate(postId, update, { new: true });
}

async function logError(jobId, stage, err) {
  await updateJob(jobId, {
    status: "failed",
    stage,
    $push: { error_log: { stage, error: err.message, timestamp: new Date() } },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 3 — SERP Research
// ─────────────────────────────────────────────────────────────────────────────
async function runSerp(postId, jobId, keyword) {
  console.log(`\n[Pipeline] ▶ Stage 3: SERP Research — "${keyword}"`);
  await updateJob(jobId, { stage: "serp", status: "running" });

  const researchData = await conductSerpResearch(keyword);

  await updateJob(jobId, {
    research_data: researchData,
    "stage_results.serp": researchData,
  });

  console.log(`[Pipeline] ✓ SERP done (${researchData.results.length} results)`);
  return researchData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 4 — Content Generation (with retry loop)
// ─────────────────────────────────────────────────────────────────────────────
async function runContent(postId, jobId, keyword, researchData, rejectionNotes = null) {
  console.log(`[Pipeline] ▶ Stage 4: Content Generation${rejectionNotes ? " (retry)" : ""}`);
  await updateJob(jobId, { stage: "content", status: "running" });

  const generated = await generateBlogContent(keyword, researchData, rejectionNotes);

  // Slug dedup
  let slug = generated.slug;
  const existing = await BlogPost.findOne({ slug, _id: { $ne: postId } });
  if (existing) slug = `${slug}-${Date.now()}`;

  await updatePost(postId, {
    title: generated.title,
    content: generated.content,
    meta: generated.meta,
    slug,
    alt_titles: generated.alt_titles || [],
    faqs: generated.faqs || [],
    tags: generated.tags || [],
    category: generated.category,
    content_original: generated.content,
    status: "draft",
    ...(rejectionNotes && { $inc: { content_retry_count: 1 } }),
  });

  await updateJob(jobId, {
    "stage_results.content": {
      title: generated.title,
      slug,
      wordCount: generated.content?.split(/\s+/).length || 0,
    },
  });

  console.log(`[Pipeline] ✓ Content done — "${generated.title}" (slug: ${slug})`);
  return { ...generated, slug };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 5 — Cover Image
// ─────────────────────────────────────────────────────────────────────────────
async function runImage(postId, jobId, keyword, title) {
  console.log(`[Pipeline] ▶ Stage 5: Cover Image`);
  await updateJob(jobId, { stage: "image", status: "running" });

  const coverUrl = await generateCoverImage(postId, keyword, title);

  await updatePost(postId, { cover_image_url: coverUrl, image: coverUrl });
  await updateJob(jobId, { "stage_results.image": { cover_image_url: coverUrl } });

  console.log(`[Pipeline] ✓ Image done — ${coverUrl}`);
  return coverUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 6 — Plagiarism Check
// ─────────────────────────────────────────────────────────────────────────────
async function runPlagiarism(postId, jobId, title, content) {
  console.log(`[Pipeline] ▶ Stage 6: Plagiarism & AI Check`);
  await updateJob(jobId, { stage: "plagiarism", status: "running" });

  const result = await checkPlagiarismAndAI(content, title);

  await updatePost(postId, {
    plagiarism_score: result.plagiarism_score,
    ai_score: result.ai_score,
  });
  await updateJob(jobId, { "stage_results.plagiarism": result });

  console.log(
    `[Pipeline] ✓ Plagiarism done — AI: ${result.ai_score ?? "skipped"}%, Plagiarism: ${result.plagiarism_score ?? "skipped"}%`
  );
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 9 — SEO Finalization
// ─────────────────────────────────────────────────────────────────────────────
async function runSeo(postId, jobId) {
  console.log(`[Pipeline] ▶ Stage 9: SEO Finalization`);
  await updateJob(jobId, { stage: "seo", status: "running" });

  const post = await BlogPost.findById(postId).lean();
  const seoMeta = await finalizeSeoMeta(post);

  await updatePost(postId, { seo_meta: seoMeta, status: "approved" });
  await updateJob(jobId, { "stage_results.seo": seoMeta });

  console.log(`[Pipeline] ✓ SEO done — canonical: ${seoMeta.canonical_url}`);
  return seoMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 10 — Publish (MongoDB status update)
// ─────────────────────────────────────────────────────────────────────────────
async function runPublish(postId, jobId) {
  console.log(`[Pipeline] ▶ Stage 10: Publish`);
  await updateJob(jobId, { stage: "publish", status: "running" });

  const post = await BlogPost.findById(postId).lean();
  const { canonical_url } = await publishPost(post);

  await updateJob(jobId, { "stage_results.publish": { canonical_url } });

  console.log(`[Pipeline] ✓ Published — ${canonical_url}`);
  return canonical_url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 11 — Indexing (optional, best-effort)
// ─────────────────────────────────────────────────────────────────────────────
async function runIndexing(postId, jobId, canonicalUrl) {
  console.log(`[Pipeline] ▶ Stage 11: Indexing`);
  await updateJob(jobId, { stage: "indexing", status: "running" });

  try {
    const result = await submitForIndexing(canonicalUrl);
    await BlogPost.findByIdAndUpdate(postId, { indexed_at: new Date() });
    await updateJob(jobId, { "stage_results.indexing": result });
    console.log(`[Pipeline] ✓ Indexing — Google: ${result.google}, IndexNow: ${result.indexNow}`);
  } catch (err) {
    // Non-critical — post is already live, don't fail the whole pipeline
    console.warn(`[Pipeline] ⚠ Indexing failed (non-critical): ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full blog pipeline for a given keyword.
 * Called by POST /api/blog/trigger
 *
 * @param {object} keyword  - Keyword document from MongoDB
 * @returns {Promise<{ postId, jobId, canonical_url }>}
 */
export async function runPipeline(keyword) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`[Pipeline] Starting for keyword: "${keyword.keyword}"`);
  console.log(`${"═".repeat(60)}`);

  // Mark keyword in_progress to prevent double-trigger
  await Keyword.findByIdAndUpdate(keyword._id, { status: "in_progress" });

  // Create stub post
  const post = await BlogPost.create({
    title: `[Generating...] ${keyword.keyword}`,
    content: "Generation in progress...",
    author: "Cloudvyn AI",
    slug: `generating-${keyword._id}-${Date.now()}`,
    keyword: keyword.keyword,
    keyword_id: keyword._id,
    status: "draft",
    is_automated: true,
  });

  // Create job tracker
  const jobDoc = await BlogJob.create({
    post_id: post._id,
    keyword_id: keyword._id,
    stage: "serp",
    status: "pending",
    started_at: new Date(),
  });

  const postId = post._id;
  const jobId = jobDoc._id;

  try {
    // ── Stage 3: SERP ──────────────────────────────────────────────────────
    const researchData = await runSerp(postId, jobId, keyword.keyword);

    // ── Stage 4: Content (with plagiarism retry loop) ──────────────────────
    let contentData = await runContent(postId, jobId, keyword.keyword, researchData);
    let retryCount = 0;

    // ── Stage 5: Cover Image ───────────────────────────────────────────────
    await runImage(postId, jobId, keyword.keyword, contentData.title);

    // ── Stage 6: Plagiarism check (with retry) ─────────────────────────────
    let plagResult = await runPlagiarism(postId, jobId, contentData.title, contentData.content);

    while (plagResult.shouldRetry && retryCount < MAX_CONTENT_RETRIES) {
      retryCount++;
      const reason = `Plagiarism: ${plagResult.plagiarism_score}%, AI: ${plagResult.ai_score}%`;

      console.warn(`[Pipeline] ⚠ Retry ${retryCount}/${MAX_CONTENT_RETRIES} — ${reason}`);

      await RetryLog.create({
        post_id: postId,
        stage: "plagiarism",
        attempt: retryCount,
        reason,
        metadata: plagResult,
      });

      const rejectionNotes = `${reason}. Rewrite with a completely different angle, more human-sounding prose, real examples and personal voice.`;
      contentData = await runContent(postId, jobId, keyword.keyword, researchData, rejectionNotes);
      await runImage(postId, jobId, keyword.keyword, contentData.title);
      plagResult = await runPlagiarism(postId, jobId, contentData.title, contentData.content);
    }

    // After plagiarism — set pending_review, wait for approve or skip to auto-approve
    await updatePost(postId, { status: "pending_review" });
    await updateJob(jobId, { stage: "plagiarism", status: "completed" });

    // ── Auto-approve if BLOG_AUTO_APPROVE=true in .env ────────────────────
    if (process.env.BLOG_AUTO_APPROVE === "true") {
      console.log("[Pipeline] Auto-approve enabled — proceeding to SEO & publish");
      await runSeo(postId, jobId);
      const canonicalUrl = await runPublish(postId, jobId);
      await runIndexing(postId, jobId, canonicalUrl);

      // Delete keyword from queue — prevents duplicate generation
      await Keyword.findByIdAndDelete(keyword._id);
      console.log(`[Pipeline] 🗑 Keyword "${keyword.keyword}" deleted from queue`);

      await updateJob(jobId, { status: "completed", completed_at: new Date() });
      console.log(`\n[Pipeline] ✅ COMPLETE — "${contentData.title}"`);
      return { postId, jobId, canonical_url: canonicalUrl };
    }

    // Delete keyword from queue — prevents duplicate generation
    await Keyword.findByIdAndDelete(keyword._id);
    console.log(`[Pipeline] 🗑 Keyword "${keyword.keyword}" deleted from queue`);

    // Otherwise wait for manual approval via POST /api/blog/approve/:id
    console.log(`\n[Pipeline] ⏸ Paused at pending_review — approve via POST /api/blog/approve/${postId}`);
    await updateJob(jobId, { status: "completed" });
    return { postId, jobId, canonical_url: null, awaiting_review: true };
  } catch (err) {
    console.error(`[Pipeline] ❌ FAILED: ${err.message}`);
    
    // Fetch latest job state to log the correct stage where it crashed
    const latestJob = await BlogJob.findById(jobId).lean();
    await logError(jobId, latestJob?.stage || "unknown", err);
    
    await updatePost(postId, { status: "failed" });
    await Keyword.findByIdAndUpdate(keyword._id, { status: "queued" }); // put back in queue
    throw err;
  }
}


/**
 * Resume a failed/paused pipeline from a specific stage.
 * Called by POST /api/blog/resume/:id
 *
 * @param {string} postId
 * @param {string} fromStage  - Stage to resume from
 */
export async function resumePipelineFromStage(postId, fromStage) {
  const post = await BlogPost.findById(postId).lean();
  const jobDoc = await BlogJob.findOne({ post_id: postId }).lean();

  if (!post || !jobDoc) throw new Error("Post or job not found");

  const stage = fromStage || jobDoc.stage;
  console.log(`[Pipeline] Resuming from stage "${stage}" for post: ${postId}`);

  const jobId = jobDoc._id;

  switch (stage) {
    case "serp": {
      const researchData = await runSerp(postId, jobId, post.keyword);
      await runContent(postId, jobId, post.keyword, researchData);
      const updatedPost = await BlogPost.findById(postId).lean();
      await runImage(postId, jobId, post.keyword, updatedPost.title);
      await runPlagiarism(postId, jobId, updatedPost.title, updatedPost.content);
      await updatePost(postId, { status: "pending_review" });
      break;
    }
    case "content": {
      const contentData = await runContent(postId, jobId, post.keyword, jobDoc.research_data, post.rejection_notes);
      await runImage(postId, jobId, post.keyword, contentData.title);
      await runPlagiarism(postId, jobId, contentData.title, contentData.content);
      await updatePost(postId, { status: "pending_review" });
      break;
    }
    case "image": {
      await runImage(postId, jobId, post.keyword, post.title);
      await runPlagiarism(postId, jobId, post.title, post.content);
      await updatePost(postId, { status: "pending_review" });
      break;
    }
    case "seo": {
      await runSeo(postId, jobId);
      const canonicalUrl = await runPublish(postId, jobId);
      await runIndexing(postId, jobId, canonicalUrl);
      break;
    }
    case "publish": {
      const canonicalUrl = await runPublish(postId, jobId);
      await runIndexing(postId, jobId, canonicalUrl);
      break;
    }
    case "indexing": {
      const freshPost = await BlogPost.findById(postId).lean();
      await runIndexing(postId, jobId, freshPost.seo_meta?.canonical_url);
      break;
    }
    default:
      throw new Error(`Unknown stage: "${stage}"`);
  }

  await updateJob(jobId, { status: "completed", completed_at: new Date() });
  console.log(`[Pipeline] ✅ Resumed and completed from stage: "${stage}"`);
}
