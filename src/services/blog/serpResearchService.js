import axios from "axios";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * SERP Research Service — Stage 3
 *
 * Uses Google Custom Search API to fetch top 10 results for a keyword.
 * Extracts titles, snippets, and URLs to inform Gemini content generation.
 *
 * Required .env:
 *   GOOGLE_API_KEY     — Google Cloud API key with Custom Search API enabled
 *   GOOGLE_CSE_ID      — Custom Search Engine ID (cx parameter)
 *
 * GCP Setup:
 *   1. Enable "Custom Search API" at console.cloud.google.com
 *   2. Create a Programmable Search Engine at cse.google.com
 *   3. Copy the cx (Search Engine ID) → GOOGLE_CSE_ID
 */

const GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";

/**
 * Fetch top SERP results for a keyword.
 * @param {string} keyword
 * @returns {Promise<{ results: Array, summary: string }>}
 */
export async function conductSerpResearch(keyword) {
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CSE_ID) {
    throw new Error(
      "GOOGLE_API_KEY and GOOGLE_CSE_ID are required for SERP research. Check your .env file."
    );
  }

  console.log(`[SERP] Researching top results for: "${keyword}"`);

  const params = {
    key: process.env.GOOGLE_API_KEY,
    cx: process.env.GOOGLE_CSE_ID,
    q: keyword,
    num: 10, // max per request
    gl: "in",  // geo-target India (adjust as needed)
    hl: "en",
  };

  const response = await axios.get(GOOGLE_SEARCH_URL, { params });
  const items = response.data.items || [];

  const results = items.map((item, idx) => ({
    rank: idx + 1,
    title: item.title,
    snippet: item.snippet,
    url: item.link,
    displayLink: item.displayLink,
  }));

  // Build a text summary for Gemini — gives context on SERP landscape
  const summary = results
    .map(
      (r) =>
        `${r.rank}. [${r.title}] (${r.displayLink})\n   ${r.snippet}`
    )
    .join("\n\n");

  // Also extract related search terms from spellingCorrections / related searches
  const relatedQueries =
    response.data.queries?.request?.[0]?.searchTerms || keyword;

  console.log(`[SERP] Found ${results.length} results for "${keyword}"`);

  return {
    keyword,
    results,
    summary,
    relatedQueries,
    total_results: response.data.searchInformation?.totalResults || "0",
    fetched_at: new Date().toISOString(),
  };
}
