import axios from "axios";
import BlogPost from "../../models/blogModel.js";
import Analytics from "../../models/blog/analyticsModel.js";
import Keyword from "../../models/blog/keywordModel.js";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * Analytics Service — Stage 12 (Weekly Cron)
 *
 * Pulls Google Search Console (GSC) data for all published posts.
 * Updates analytics collection and refreshes keyword priority scores.
 *
 * Required .env:
 *   GSC_SITE_URL     — Your verified GSC property URL (e.g. https://yourblog.com)
 *   GCS_KEY_JSON or GCS_KEY_FILE — Service account with GSC read access
 *
 * GSC Setup:
 *   1. Go to Search Console → Settings → Users & Permissions
 *   2. Add your service account email as "Owner" or "Full user"
 *   3. Enable "Search Console API" in GCP Console
 */

const GSC_API = "https://searchconsole.googleapis.com/webmasters/v3";

/**
 * Get an authorized GSC API client token.
 */
async function getGscAccessToken() {
  let credentials;
  if (process.env.GCS_KEY_JSON) {
    credentials = JSON.parse(process.env.GCS_KEY_JSON);
  } else if (process.env.GCS_KEY_FILE) {
    const { readFileSync } = await import("fs");
    credentials = JSON.parse(readFileSync(process.env.GCS_KEY_FILE, "utf8"));
  } else {
    throw new Error("No GCS credentials found for GSC analytics pull");
  }

  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  return tokenRes.token;
}

/**
 * Fetch GSC metrics for a single URL (last 7 days).
 */
async function fetchGscMetricsForUrl(url, siteUrl, token) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  const fmt = (d) => d.toISOString().split("T")[0];

  const response = await axios.post(
    `${GSC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ["page"],
      dimensionFilterGroups: [
        {
          filters: [
            {
              dimension: "page",
              operator: "equals",
              expression: url,
            },
          ],
        },
      ],
      rowLimit: 1,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    }
  );

  const row = response.data.rows?.[0];
  if (!row) return null;

  return {
    impressions: row.impressions || 0,
    clicks: row.clicks || 0,
    ctr: row.ctr || 0,
    avg_position: row.position || null,
  };
}

/**
 * Pull GSC analytics for all published posts and update DB.
 * Called by the weekly cron job.
 * @returns {Promise<{ updated: number, errors: number }>}
 */
export async function pullAndStoreAnalytics() {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) {
    throw new Error("GSC_SITE_URL not set — cannot pull analytics");
  }

  console.log("[Analytics] Starting weekly GSC pull...");

  let token;
  try {
    token = await getGscAccessToken();
  } catch (err) {
    throw new Error(`GSC auth failed: ${err.message}`);
  }

  // Get all published posts with a WP URL
  const posts = await BlogPost.find(
    { status: "published", wp_id: { $ne: null } },
    { _id: 1, wp_id: 1, seo_meta: 1, keyword_id: 1 }
  ).lean();

  console.log(`[Analytics] Pulling metrics for ${posts.length} published posts`);

  let updated = 0;
  let errors = 0;

  for (const post of posts) {
    const postUrl = post.seo_meta?.canonical_url;
    if (!postUrl) continue;

    try {
      const metrics = await fetchGscMetricsForUrl(postUrl, siteUrl, token);

      if (!metrics) {
        console.log(`[Analytics] No GSC data yet for: ${postUrl}`);
        continue;
      }

      // Upsert analytics document
      await Analytics.findOneAndUpdate(
        { post_id: post._id },
        {
          post_id: post._id,
          wp_id: post.wp_id,
          url: postUrl,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          ctr: metrics.ctr,
          avg_position: metrics.avg_position,
          pulled_at: new Date(),
          $push: {
            history: {
              $each: [
                {
                  impressions: metrics.impressions,
                  clicks: metrics.clicks,
                  ctr: metrics.ctr,
                  avg_position: metrics.avg_position,
                  date: new Date(),
                },
              ],
              $slice: -52, // keep last 52 weeks
            },
          },
        },
        { upsert: true, new: true }
      );

      // Update keyword priority based on avg_position
      // If position < 10 → promoted; if position > 50 → deprioritize
      if (post.keyword_id && metrics.avg_position) {
        let priorityBoost = 0;
        if (metrics.avg_position <= 10) priorityBoost = 2;
        else if (metrics.avg_position <= 20) priorityBoost = 1;
        else if (metrics.avg_position > 50) priorityBoost = -1;

        if (priorityBoost !== 0) {
          await Keyword.findByIdAndUpdate(post.keyword_id, {
            $inc: { priority: priorityBoost },
          });
        }
      }

      updated++;
    } catch (err) {
      console.error(`[Analytics] Error for ${postUrl}:`, err.message);
      errors++;
    }

    // Throttle: 1 request per 200ms to avoid GSC rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[Analytics] Done. Updated: ${updated}, Errors: ${errors}`);
  return { updated, errors };
}
