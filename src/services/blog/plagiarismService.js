import axios from "axios";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * Plagiarism & AI Detection Service — Stage 6
 *
 * Uses Originality.ai API to check:
 *   - Plagiarism score (0–100, lower is better)
 *   - AI-generated content score (0–100, lower is better)
 *
 * Decision logic:
 *   - plagiarism_score > 15%  → trigger content retry
 *   - ai_score > 60%          → trigger content retry
 *   - Max 2 retries via retry_log collection
 *
 * Required .env:
 *   ORIGINALITY_AI_KEY — Get from app.originality.ai/api-key
 *
 * Optional: If key is not set, this stage is skipped gracefully with null scores.
 */

const ORIGINALITY_API_URL = "https://api.originality.ai/api/v1/scan/ai";

/**
 * Check content for plagiarism and AI detection.
 * Returns null scores if API key is missing (opt-out mode).
 *
 * @param {string} content - HTML or plaintext content
 * @param {string} title   - Article title
 * @returns {Promise<{ plagiarism_score: number|null, ai_score: number|null, raw: object|null, shouldRetry: boolean }>}
 */
export async function checkPlagiarismAndAI(content, title) {
  if (!process.env.ORIGINALITY_AI_KEY) {
    console.warn(
      "[Plagiarism] ORIGINALITY_AI_KEY not set — skipping check. Add key to enable."
    );
    return {
      plagiarism_score: null,
      ai_score: null,
      raw: null,
      shouldRetry: false,
      skipped: true,
    };
  }

  // Strip HTML tags for cleaner scan
  const plainText = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  console.log(`[Plagiarism] Scanning article: "${title}" (${plainText.length} chars)`);

  try {
    const response = await axios.post(
      ORIGINALITY_API_URL,
      {
        content: plainText,
        title,
        // Scan for both AI and plagiarism
        aiModelVersion: "2.0",
        storeScan: false, // don't store — saves API credits
      },
      {
        headers: {
          "X-OAI-API-KEY": process.env.ORIGINALITY_AI_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    const data = response.data;

    // Originality.ai returns: data.score.ai (0-1) and data.score.original (0-1)
    const ai_score = Math.round((data?.score?.ai || 0) * 100);
    const plagiarism_score = Math.round((1 - (data?.score?.original || 1)) * 100);

    console.log(
      `[Plagiarism] AI Score: ${ai_score}% | Plagiarism Score: ${plagiarism_score}%`
    );

    // Thresholds
    const PLAGIARISM_THRESHOLD = 15; // percent
    const AI_SCORE_THRESHOLD = 60;   // percent

    const shouldRetry =
      plagiarism_score > PLAGIARISM_THRESHOLD ||
      ai_score > AI_SCORE_THRESHOLD;

    if (shouldRetry) {
      console.warn(
        `[Plagiarism] Scores exceed threshold — triggering content retry.`
      );
    }

    return {
      plagiarism_score,
      ai_score,
      raw: data,
      shouldRetry,
      skipped: false,
    };
  } catch (err) {
    // Don't fail the whole pipeline for plagiarism check errors
    console.error("[Plagiarism] API error:", err.response?.data || err.message);
    return {
      plagiarism_score: null,
      ai_score: null,
      raw: null,
      shouldRetry: false,
      skipped: true,
      error: err.message,
    };
  }
}
