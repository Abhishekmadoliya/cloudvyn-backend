import { VertexAI } from "@google-cloud/vertexai";
import slugify from "slugify";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * Content Generator Service — Stage 4 (Vertex AI Version)
 */

import path from "path";

// Initialize Vertex AI with service account credentials
const vertexAI = new VertexAI({
  project: process.env.VERTEX_PROJECT_ID,
  location: "us-central1",
  googleAuthOptions: {
    keyFilename: path.resolve(process.env.VERTEX_KEY_PATH),
  },
});

const CONTENT_MODEL = "gemini-2.5-pro"; // Highly efficient and available model on Vertex AI

/**
 * Build the master content generation prompt.
 */
/**
 * Build the master content generation prompt.
 * v2 — Anti-AI, SERP-first, semantic depth upgrade
 */
function buildContentPrompt(keyword, researchData, rejectionNotes = null) {
  const serpContext =
    researchData?.summary ||
    "No SERP data available. Use your training knowledge to infer what top-ranking content covers.";

  const retryHint = rejectionNotes
    ? `\n\n⚠️ REJECTION OVERRIDE — Previous draft was rejected. Reason: "${rejectionNotes}". 
Completely rethink structure, angle, and tone. Do NOT reuse any sentence, section, or argument from the previous version.`
    : "";

  return `You are a veteran editorial writer and SEO specialist with 10+ years writing high-traffic articles for top-tier publications. You write like a human expert — opinionated, specific, occasionally imperfect — never like a content generator.

════════════════════════════════════
TARGET KEYWORD: "${keyword}"
════════════════════════════════════

SERP LANDSCAPE (study gaps, don't replicate):
${serpContext}
${retryHint}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITING PHILOSOPHY — READ BEFORE GENERATING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VOICE & TONE:
- Write like a knowledgeable colleague explaining something at a whiteboard — direct, confident, occasionally conversational
- Use "you" and "your" naturally. Vary sentence length deliberately (short punchy sentences after long ones create rhythm)
- Include 1–2 minor qualifications ("this depends on...", "in most cases...") — humans hedge; AI over-asserts
- BANNED PHRASES — never use: "In today's fast-paced world", "It's important to note", "Delve into", "In conclusion", "Comprehensive guide to", "Furthermore", "Moreover", "Additionally", "It's worth noting", "Moving on"
- BANNED PATTERNS — no lists of 5–7 generic bullet points that say nothing specific; no symmetric section structure where every H2 has exactly the same format

ORIGINALITY RULES:
- Every paragraph must contain at least one specific detail, number, example, or named tool/concept — nothing generic
- Do not mirror competitor structure from the SERP data above. Find the gap and own it.
- Write a unique angle/hook not present in the SERP landscape
- No transitional filler between sections

CONTENT DEPTH SIGNALS (Google E-E-A-T):
- Reference at least 2 real-world scenarios or domain-specific edge cases
- Include one counter-intuitive insight — something most articles on this topic miss
- Add practical nuance: mention what can go wrong, what the exceptions are, or what context changes the advice

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEO ARCHITECTURE REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEYWORD INTEGRATION:
- Exact-match keyword: in H1, within first 100 words, in at least 1 H2, in meta, in conclusion — naturally, never forced
- Use 3–5 semantically related LSI terms throughout — one use per related term is enough
- Use question-format subheadings where natural (triggers People Also Ask features)

STRUCTURAL SEO:
- Article length: 1400–1700 words (longer than competitors signals authority)
- First paragraph: Hook + context + keyword + what the reader will learn — all within 80 words
- Add a "Key Takeaways" block near the top inside <div class="key-takeaways"> — improves dwell time
- Include a statistics or data section inside <div class="stats-block"> with real or credibly framed figures
- Conclusion must include a soft CTA relevant to Cloudvyn (career tools, interview prep, job matching)

HTML OUTPUT RULES:
- Use proper semantic hierarchy: one <h1> (title), <h2> for major sections, <h3> for subsections
- Wrap intro paragraph in <p class="intro-lead">
- Use <strong> for genuinely important terms only — 2–4 times maximum
- Use <ul> / <ol> sparingly — only when list format is genuinely clearer than prose
- NO inline styles. NO placeholder comments like <!-- add image here -->

FINAL SELF-CHECK — before writing the JSON, verify:
✓ No paragraph starts with "I", "We", "This article", or the keyword itself
✓ No two consecutive sentences start with the same word
✓ The content field contains no placeholder text or template markers
✓ FAQ questions are genuinely different from subheadings in the article
✓ All banned phrases are absent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLES — Return a single valid JSON object with these exact keys:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "title": "Primary SEO title (50-60 chars, includes keyword)",
  "alt_titles": ["Title option 2", "Title option 3", "Title option 4"],
  "meta": "Compelling meta description, exactly 150-160 characters, includes keyword naturally",
  "content": "FULL HTML article (1400-1700 words). Use <h2>, <h3> heading hierarchy. Include the keyword in H1, first paragraph, 2-3 subheadings, conclusion. Add a key-takeaways block and a stats-block section. Write in active voice. Escape any double quotes inside HTML using backslashes.",
  "faqs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ],
  "schema": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "...",
    "description": "...",
    "author": {"@type": "Organization", "name": "Cloudvyn"}
  },
  "tags": ["tag1", "tag2"],
  "category": "Technology"
}

Return ONLY the JSON object. No preamble, no explanation, no markdown fences.`;
}

/**
 * Generate full blog content using Vertex AI Imagen.
 */
export async function generateBlogContent(keyword, researchData, rejectionNotes = null) {
  console.log(`[Content] Generating article (Vertex AI) for: "${keyword}"`);

  const model = vertexAI.getGenerativeModel({
    model: CONTENT_MODEL,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const prompt = buildContentPrompt(keyword, researchData, rejectionNotes);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const response = result.response;
  const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!rawText) throw new Error("Gemini returned empty response");

  try {
    // Vertex AI with responseMimeType usually returns clean JSON
    const parsed = JSON.parse(rawText.trim());

    // Auto-generate slug if not present
    if (!parsed.slug) {
      parsed.slug = slugify(parsed.title, { lower: true, strict: true }) + "-" + Date.now();
    }

    return parsed;
  } catch (err) {
    console.error("[Content] JSON Parse failed. Error:", err.message);
    console.error("[Content] Raw snippet:", rawText.substring(0, 500));
    throw new Error(`Gemini returned invalid JSON: ${err.message}`);
  }
}
