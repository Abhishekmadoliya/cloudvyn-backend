import BlogPost from "../../models/blogModel.js";
import Keyword from "../../models/blog/keywordModel.js";
import BlogJob from "../../models/blog/jobModel.js";
import Analytics from "../../models/blog/analyticsModel.js";
import RetryLog from "../../models/blog/retryLogModel.js";
import { runPipeline, resumePipelineFromStage } from "../../services/blog/pipelineOrchestrator.js";
import { finalizeSeoMeta } from "../../services/blog/seoFinalizerService.js";
import { publishPost } from "../../services/blog/publishService.js";
import { submitForIndexing } from "../../services/blog/indexingService.js";
import keywordModel from "../../models/blog/keywordModel.js";

/**
 * Blog Automation Controller
 *
 * POST /api/blog/trigger      — Start pipeline for next queued keyword
 * POST /api/blog/approve/:id  — Approve pending_review post → SEO → Publish
 * POST /api/blog/reject/:id   — Reject → regenerate with new angle
 * GET  /api/blog/status       — Pipeline dashboard
 * GET  /api/blog/queue        — Keyword queue view
 * POST /api/blog/keywords     — Add keywords manually
 * GET  /api/blog/post/:id     — Single post + job + analytics + retries
 * POST /api/blog/resume/:id   — Resume failed pipeline from last stage
 */

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/blog/trigger
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerPipeline(req, res) {
  try {
    // Check if another pipeline is already running
    const running = await BlogJob.findOne({ status: "running" });
    if (running) {
      return res.status(409).json({
        success: false,
        message: "A pipeline is already running. Wait for it to finish or resume a failed one.",
        runningJobId: running._id,
      });
    }

    // Pick next queued keyword — priority desc, kd_score asc
    const keyword = await Keyword.findOne({ status: "queued" })
      .sort({ priority: -1, kd_score: 1, added_at: 1 })
      .lean();


    console.log("keyword which will be deleted", keyword)


    if (!keyword) {
      return res.status(200).json({
        success: false,
        message: "No queued keywords found. Add keywords via POST /api/blog/keywords",
      });
    }

    // Run pipeline in background — don't await (returns immediately to cron/API)
    // The pipeline writes progress to MongoDB at each stage.
    res.status(200).json({
      success: true,
      message: `Pipeline started for keyword: "${keyword.keyword}"`,
      keyword: keyword.keyword,
    });

    // Run after response is sent
    runPipeline(keyword).catch((err) => {
      console.error(`[Trigger] Pipeline failed: ${err.message}`);
    });
  } catch (err) {
    console.error("[Trigger] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/blog/approve/:id
// ─────────────────────────────────────────────────────────────────────────────
export async function approvePost(req, res) {
  try {
    const { id } = req.params;

    const post = await BlogPost.findById(id).lean();
    if (!post) return res.status(404).json({ success: false, error: "Post not found" });

    if (!["pending_review", "draft"].includes(post.status)) {
      return res.status(400).json({
        success: false,
        error: `Post status is "${post.status}" — can only approve posts in pending_review`,
      });
    }

    const jobDoc = await BlogJob.findOne({ post_id: id }).lean();
    if (!jobDoc) return res.status(404).json({ success: false, error: "Job not found" });

    // Return immediately — run SEO + publish in background
    res.status(200).json({
      success: true,
      message: "Post approved — SEO finalization + publish started",
      postId: id,
    });

    // SEO → Publish → Index (background)
    ; (async () => {
      try {
        // SEO finalization
        await BlogJob.findByIdAndUpdate(jobDoc._id, { stage: "seo", status: "running" });
        const seoMeta = await finalizeSeoMeta(post);
        await BlogPost.findByIdAndUpdate(id, { seo_meta: seoMeta, status: "approved" });
        await BlogJob.findByIdAndUpdate(jobDoc._id, { "stage_results.seo": seoMeta });

        // Publish (MongoDB status update)
        await BlogJob.findByIdAndUpdate(jobDoc._id, { stage: "publish", status: "running" });
        const freshPost = await BlogPost.findById(id).lean();
        const { canonical_url } = await publishPost(freshPost);
        await BlogJob.findByIdAndUpdate(jobDoc._id, {
          "stage_results.publish": { canonical_url },
          stage: "publish",
        });

        // Mark keyword published
        if (post.keyword_id) {
          await Keyword.findByIdAndUpdate(post.keyword_id, {
            status: "published",
            post_id: id,
          });
        }

        // Indexing (best-effort)
        await BlogJob.findByIdAndUpdate(jobDoc._id, { stage: "indexing", status: "running" });
        const indexResult = await submitForIndexing(canonical_url).catch((e) => {
          console.warn("[Approve] Indexing failed (non-critical):", e.message);
          return { google: false, indexNow: false };
        });
        await BlogPost.findByIdAndUpdate(id, { indexed_at: new Date() });
        await BlogJob.findByIdAndUpdate(jobDoc._id, {
          "stage_results.indexing": indexResult,
          status: "completed",
          completed_at: new Date(),
        });

        console.log(`[Approve] Pipeline complete for post: ${id} → ${canonical_url}`);
      } catch (err) {
        console.error("[Approve] Background error:", err.message);
        await BlogJob.findByIdAndUpdate(jobDoc._id, {
          status: "failed",
          $push: { error_log: { stage: "approve-flow", error: err.message } },
        });
        await BlogPost.findByIdAndUpdate(id, { status: "failed" });
      }
    })();
  } catch (err) {
    console.error("[Approve] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/blog/reject/:id
// ─────────────────────────────────────────────────────────────────────────────
export async function rejectPost(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const post = await BlogPost.findById(id).lean();
    if (!post) return res.status(404).json({ success: false, error: "Post not found" });

    const rejectionNotes =
      reason ||
      "Human reviewer rejected this content. Rewrite with a completely different angle, structure, and examples.";

    await RetryLog.create({
      post_id: id,
      stage: "review",
      attempt: (post.content_retry_count || 0) + 1,
      reason: rejectionNotes,
    });

    await BlogPost.findByIdAndUpdate(id, {
      status: "rejected",
      rejection_notes: rejectionNotes,
    });

    res.status(200).json({
      success: true,
      message: "Post rejected — regenerating with new angle",
      postId: id,
    });

    // Re-run from content stage in background
    resumePipelineFromStage(id, "content").catch((err) => {
      console.error(`[Reject] Regeneration failed: ${err.message}`);
    });
  } catch (err) {
    console.error("[Reject] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/blog/status
// ─────────────────────────────────────────────────────────────────────────────
export async function getPipelineStatus(req, res) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { is_automated: true };
    if (status) query.status = status;

    const [posts, total, statusCounts] = await Promise.all([
      BlogPost.find(query, {
        title: 1, keyword: 1, status: 1, plagiarism_score: 1, ai_score: 1,
        published_at: 1, indexed_at: 1, cover_image_url: 1,
        content_retry_count: 1, createdAt: 1, slug: 1,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BlogPost.countDocuments(query),
      BlogPost.aggregate([
        { $match: { is_automated: true } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    // Attach live job stage to each post
    const postIds = posts.map((p) => p._id);
    const jobs = await BlogJob.find(
      { post_id: { $in: postIds } },
      { post_id: 1, stage: 1, status: 1, retry_count: 1, error_log: 1 }
    ).lean();

    const jobByPost = {};
    jobs.forEach((j) => { jobByPost[j.post_id.toString()] = j; });

    const enriched = posts.map((p) => ({
      ...p,
      job: jobByPost[p._id.toString()] || null,
    }));

    // Is any pipeline currently running?
    const runningJob = await BlogJob.findOne({ status: "running" }, { stage: 1, post_id: 1 }).lean();

    return res.status(200).json({
      success: true,
      data: {
        posts: enriched,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
        currentlyRunning: runningJob || null,
        statusBreakdown: statusCounts,
      },
    });
  } catch (err) {
    console.error("[Status] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/blog/queue
// ─────────────────────────────────────────────────────────────────────────────
export async function getKeywordQueue(req, res) {
  try {
    const { status = "queued", page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [keywords, total, statusCounts] = await Promise.all([
      Keyword.find({ status })
        .sort({ priority: -1, kd_score: 1, added_at: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Keyword.countDocuments({ status }),
      Keyword.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    return res.status(200).json({
      success: true,
      data: { keywords, pagination: { page: parseInt(page), limit: parseInt(limit), total }, statusCounts },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/blog/keywords
// ─────────────────────────────────────────────────────────────────────────────
export async function addKeywords(req, res) {
  try {
    const { keywords } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Provide a 'keywords' array: [{ keyword, priority, kd_score, search_volume, source }]",
      });
    }

    const results = await Promise.allSettled(
      keywords.map((k) =>
        Keyword.findOneAndUpdate(
          { keyword: k.keyword?.toLowerCase().trim() },
          {
            $setOnInsert: {
              keyword: k.keyword.toLowerCase().trim(),
              priority: k.priority || 5,
              kd_score: k.kd_score || 0,
              search_volume: k.search_volume || 0,
              source: k.source || "manual",
              status: "queued",
              added_at: new Date(),
            },
          },
          { upsert: true, new: true }
        )
      )
    );

    const added = results.filter((r) => r.status === "fulfilled").length;
    return res.status(200).json({
      success: true,
      message: `${added}/${keywords.length} keywords added to queue`,
      data: results.filter((r) => r.status === "fulfilled").map((r) => ({
        keyword: r.value.keyword,
        status: r.value.status,
        priority: r.value.priority,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/blog/post/:id
// ─────────────────────────────────────────────────────────────────────────────
export async function getPostWithJob(req, res) {
  try {
    const { id } = req.params;
    const [post, jobDoc, analytics, retryLogs] = await Promise.all([
      BlogPost.findById(id).lean(),
      BlogJob.findOne({ post_id: id }).lean(),
      Analytics.findOne({ post_id: id }).lean(),
      RetryLog.find({ post_id: id }).sort({ timestamp: -1 }).lean(),
    ]);

    if (!post) return res.status(404).json({ success: false, error: "Post not found" });

    return res.status(200).json({
      success: true,
      data: { post, job: jobDoc, analytics, retryLogs },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/blog/resume/:id
// ─────────────────────────────────────────────────────────────────────────────
export async function resumePipeline(req, res) {
  try {
    const { id } = req.params;
    const { fromStage } = req.body;

    // Return immediately
    res.status(200).json({
      success: true,
      message: `Resuming pipeline from stage: "${fromStage || "last known"}"`,
      postId: id,
    });

    resumePipelineFromStage(id, fromStage).catch((err) => {
      console.error(`[Resume] Failed: ${err.message}`);
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
