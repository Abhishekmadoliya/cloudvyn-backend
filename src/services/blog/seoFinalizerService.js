import { VertexAI } from "@google-cloud/vertexai";
import BlogPost from "../../models/blogModel.js";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * SEO Finalizer Service — Stage 9 (Vertex AI Version)
 */

import path from "path";

const vertexAI = new VertexAI({
  project: process.env.VERTEX_PROJECT_ID,
  location: "us-central1",
  googleAuthOptions: {
    keyFilename: path.resolve(process.env.VERTEX_KEY_PATH),
  },
});

const SEO_MODEL = "gemini-1.5-flash";

/**
 * Build the SEO optimization prompt.
 */
function buildSeoPrompt(post, internalLinks = [], wpBaseUrl = "") {
  return `You are an expert technical SEO specialist. Finalize this blog post for production.

POST TITLE: "${post.title}"
CONTENT: "${post.content.substring(0, 5000)}..."

TASK:
Return a JSON object with:
1. "focus_keyword": Best single keyword.
2. "is_indexable": true/false.
3. "canonical_url": Full URL.
4. "internal_links_added": Array of URLs used.
5. "seo_score": 0-100.

Return ONLY the JSON.`;
}

/**
 * Finalize SEO metadata using Vertex AI.
 */
export async function finalizeSeoMeta(post, internalLinks = [], wpBaseUrl = "") {
  console.log(`[SEO] Finalizing meta (Vertex AI) for: "${post.title}"`);

  const model = vertexAI.getGenerativeModel({
    model: SEO_MODEL,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const prompt = buildSeoPrompt(post, internalLinks, wpBaseUrl);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const rawText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";

  try {
    return JSON.parse(rawText.trim());
  } catch (err) {
    console.warn("[SEO] JSON parse failed, returning fallback meta.");
    return {
      focus_keyword: post.keyword || "",
      is_indexable: true,
      canonical_url: `${wpBaseUrl}/blog/${post.slug}`,
      seo_score: 70,
    };
  }
}
