import cron from "node-cron";
import axios from "axios";
import { addBlogJob } from "../queues/blogQueue.js";
import { configDotenv } from "dotenv";

configDotenv();

const API_BASE = `http://localhost:${process.env.PORT || 8000}`;

/**
 * Blog Automation Cron Jobs
 *
 * 1. Daily at 9 AM IST     → triggers the blog generation pipeline
 * 2. Weekly Sunday 8 AM IST → triggers GSC analytics pull
 *
 * Both crons call the same Express API endpoints so all logic
 * stays centralized in the controller (easier to test + debug).
 */

let dailyCronJob = null;
let weeklyCronJob = null;

/**
 * Initialize all blog cron jobs.
 * Call this once at app startup.
 */
export function initBlogCron() {
  // ── Daily pipeline trigger: 9:00 AM IST (UTC+5:30 = 3:30 AM UTC) ──────────
  dailyCronJob = cron.schedule(
    "35` 22 * * *",
    async () => {
      console.log("[Cron:Daily] Triggered at", new Date().toISOString());
      try {
        const response = await axios.post(`${API_BASE}/api/blog/trigger`, {}, {
          timeout: 10000,
          headers: { "x-cron-source": "node-cron" },
        });
        console.log("[Cron:Daily] Pipeline response:", response.data?.message);
      } catch (err) {
        console.error("[Cron:Daily] Failed to trigger pipeline:", err.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
      runOnInit: false,
    }
  );

  console.log("[Cron] Daily blog pipeline scheduled: 2:55 PM IST");

  // ── Weekly analytics pull: Every Sunday at 8 AM IST ─────────────────────
  weeklyCronJob = cron.schedule(
    "0 8 * * 0",
    async () => {
      console.log("[Cron:Weekly] GSC analytics pull triggered at", new Date().toISOString());
      try {
        // Enqueue analytics job directly (no HTTP round-trip needed)
        await addBlogJob("analytics", {
          postId: "bulk",
          jobDocId: "bulk",
          keyword: "analytics-pull",
        });
        console.log("[Cron:Weekly] Analytics job enqueued successfully");
      } catch (err) {
        console.error("[Cron:Weekly] Failed to enqueue analytics job:", err.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
      runOnInit: false,
    }
  );

  console.log("[Cron] Weekly analytics pull scheduled: 8:00 AM IST every Sunday");
}

/**
 * Stop all cron jobs (for testing / graceful shutdown).
 */
export function stopBlogCron() {
  if (dailyCronJob) dailyCronJob.stop();
  if (weeklyCronJob) weeklyCronJob.stop();
  console.log("[Cron] Blog cron jobs stopped.");
}
