import axios from "axios";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * SERP Research Service (Serper.dev) — Stage 3
 *
 * Uses Serper.dev API to fetch top 10 results for a keyword.
 * Extracts titles, snippets, "People Also Ask", and related searches.
 *
 * Required .env:
 *   SERPER_API_KEY — Get this from https://serper.dev
 */

const SERPER_URL = "https://google.serper.dev/search";

/**
 * Fetch top SERP results for a keyword using Serper.dev.
 * @param {string} keyword
 * @returns {Promise<{ results: Array, summary: string, relatedQueries: string }>}
 */
export async function conductSerpResearch(keyword) {
  if (!process.env.SERPER_API_KEY) {
    throw new Error(
      "SERPER_API_KEY is required for SERP research. Check your .env file."
    );
  }

  console.log(`[SERP:Serper] Researching top results for: "${keyword}"`);

  const payload = {
    q: keyword,
    gl: "in", // geo-target India
    hl: "en",
    num: 10,
  };

  const response = await axios.post(SERPER_URL, payload, {
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY,
      "Content-Type": "application/json",
    },
  });

  const data = response.data;
  const organic = data.organic || [];
  const paa = data.peopleAlsoAsk || [];
  const related = data.relatedSearches || [];

  const results = organic.map((item, idx) => ({
    rank: idx + 1,
    title: item.title,
    snippet: item.snippet,
    url: item.link,
    displayLink: item.link, 
  }));

  // Build a highly detailed text summary for Gemini
  let summary = results
    .map((r) => `${r.rank}. [${r.title}] (${r.displayLink})\n   ${r.snippet}`)
    .join("\n\n");

  if (paa.length > 0) {
    summary += "\n\n--- PEOPLE ALSO ASK ---\n";
    summary += paa.map((q) => `- Q: ${q.question}\n  A: ${q.snippet || ""}`).join("\n");
  }

  const relatedQueries = related.map((r) => r.query).join(", ") || keyword;

  console.log(`[SERP:Serper] Found ${results.length} results + ${paa.length} PAA questions for "${keyword}"`);

  return {
    keyword,
    results,
    summary,
    relatedQueries,
    total_results: data.searchParameters?.q ? "many" : "0",
    fetched_at: new Date().toISOString(),
  };
}
