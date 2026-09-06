import axios from "axios";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * Indexing Service — Stage 11
 *
 * Notifies search engines that a new URL is ready to be crawled.
 *
 * Actions:
 *   1. Google Indexing API — instant crawl request (requires service account)
 *   2. IndexNow — pings Bing/Yandex/Seznam instantly (just an API key)
 *
 * Required .env:
 *   WP_URL                    — Published post base URL
 *   GOOGLE_INDEXING_ENABLED   — Set to "true" to enable Google Indexing API
 *   GCS_KEY_JSON or GCS_KEY_FILE — Service account (needs Search Console + Indexing API roles)
 *   INDEXNOW_KEY              — Your IndexNow key (generate at www.bing.com/indexnow)
 *
 * Google Indexing API Setup:
 *   1. Enable "Indexing API" in GCP Console
 *   2. Add service account email as Owner in Search Console property
 *      (Search Console → Settings → Users & Permissions → Add)
 *   3. Use GCS_KEY_JSON credentials (same service account)
 */

/**
 * Ping Google Indexing API for a URL.
 */
async function pingGoogleIndexing(postUrl) {
  if (process.env.GOOGLE_INDEXING_ENABLED !== "true") {
    console.log("[Indexing] Google Indexing API disabled. Set GOOGLE_INDEXING_ENABLED=true to enable.");
    return false;
  }

  let credentials;
  try {
    if (process.env.GCS_KEY_JSON) {
      credentials = JSON.parse(process.env.GCS_KEY_JSON);
    } else if (process.env.GCS_KEY_FILE) {
      const { readFileSync } = await import("fs");
      credentials = JSON.parse(readFileSync(process.env.GCS_KEY_FILE, "utf8"));
    } else {
      throw new Error("No GCS credentials found for Google Indexing API");
    }

    // Get OAuth2 token using service account JWT
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });

    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    const token = tokenRes.token;

    await axios.post(
      "https://indexing.googleapis.com/v3/urlNotifications:publish",
      { url: postUrl, type: "URL_UPDATED" },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log(`[Indexing] Google Indexing API pinged for: ${postUrl}`);
    return true;
  } catch (err) {
    console.warn(`[Indexing] Google Indexing API failed: ${err.message}`);
    return false;
  }
}

/**
 * Ping IndexNow for Bing/Yandex.
 */
async function pingIndexNow(postUrl) {
  if (!process.env.INDEXNOW_KEY) {
    console.log("[Indexing] INDEXNOW_KEY not set — skipping Bing IndexNow.");
    return false;
  }

  try {
    const wpHostname = new URL(process.env.WP_URL || postUrl).hostname;

    await axios.post(
      "https://api.indexnow.org/indexnow",
      {
        host: wpHostname,
        key: process.env.INDEXNOW_KEY,
        urlList: [postUrl],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 8000,
      }
    );

    console.log(`[Indexing] IndexNow pinged for: ${postUrl}`);
    return true;
  } catch (err) {
    console.warn(`[Indexing] IndexNow failed: ${err.message}`);
    return false;
  }
}

/**
 * Submit a published post URL to all search engine indexing APIs.
 * @param {string} postUrl - The live WordPress URL of the post
 * @returns {Promise<{ google: boolean, indexNow: boolean }>}
 */
export async function submitForIndexing(postUrl) {
  console.log(`[Indexing] Submitting URL: ${postUrl}`);

  const [google, indexNow] = await Promise.allSettled([
    pingGoogleIndexing(postUrl),
    pingIndexNow(postUrl),
  ]);

  return {
    google: google.status === "fulfilled" && google.value === true,
    indexNow: indexNow.status === "fulfilled" && indexNow.value === true,
    submitted_at: new Date().toISOString(),
  };
}
