import { Ollama } from "ollama";
import axios from 'axios';


const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || "https://ollama.com",
  headers: {
    Authorization: "Bearer " + process.env.OLLAMA_API_KEY_2,
  },
});

export async function generateWithOllama(prompt, history = [], modelOverride = null) {
  try {
    const systemPrompt = "You are an AI research assistant + technical interview prep teacher. Provide accurate, concise, structured responses based on the context if provided.";

    // Convert history to proper format for Ollama
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content || msg.text || ''
      })),
      { role: "user", content: prompt }
    ];

    const response = await ollama.chat({
      model: modelOverride || process.env.OLLAMA_MODEL || "gpt-oss:120b",
      messages: messages,
      stream: false,
    });

    // Sanitization: Remove ** as requested by user
    const sanitizedText = response.message.content.replace(/\*\*/g, '');

    return {
      text: sanitizedText,
      model: modelOverride || process.env.OLLAMA_MODEL || "ollama-fallback"
    };
  } catch (error) {
    console.error("Ollama generation error:", error);
    throw new Error(`Ollama failed: ${error.message}`);
  }
}

export async function generateFeedPostWithOllama(systemPrompt, modelOverride = null) {
  try {
    console.log("Generating feed post with Ollama...");

    // We pass the persona's system instructions as the main prompt.
    // We add a strict JSON formatting instruction because we need clean extraction.
    const prompt = `
      ${systemPrompt}

      ### OUTPUT REQUIREMENT:
      Return YOUR FULL POST CONTENT within a JSON object. Do not include any markdown blocks around the JSON, just the raw JSON object.
      
      {
        "headline": "A punchy, SEO-friendly headline (10-15 words max)",
        "content": "Your complete post content here, structured in 2-3 brief paragraphs...",
        "summary": "A 1-2 sentence hook/summary of the post..."
      }
    `;

    const result = await generateWithOllama(prompt, [], modelOverride);

    // Clean up potential markdown blocks if the model wrapped the JSON
    const cleanText = result.text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    return {
      headline: parsed.headline || "",
      content: parsed.content,
      summary: parsed.summary || parsed.content.substring(0, 150) + "...",
      model: result.model
    };
  } catch (error) {
    console.error("Feed Post Generation Error:", error);
    // Fallback if parsing fails
    return {
      content: "Failed to generate AI content cleanly. Please try again or refine the persona instructions.",
      summary: "Generation failed.",
      model: "error"
    };
  }
}


export async function anaylzeResumeWithOllama(resumeText) {
  try {
    console.log("Analyzing text with Ollama...");

    const prompt = `
      You are an expert Senior Technical Recruiter and Career Coach with 20 years of experience in Silicon Valley, specializing in FAANG and high-growth startups.
      
      Your task is to analyze the following text and determine if it is a professional resume/CV. 
      
      ### GUIDELINES:
      1. **Expert Perspective**: Evaluate it like a human would—look for impact, quantifiable achievements, clarity, and professional progression. Don't just list keywords; analyze the DEPTH of the experience.
      2. **Detection**: If the text is NOT a resume (e.g., it's a blog post, a recipe, random strings, or an empty document), set "isResume" to false and provide a friendly explanation in the "summary" field.
      3. **Actionable Feedback**: Provide specific, brutal yet constructive feedback. If someone is missing a key technology for their stated title, call it out.
      4. **Structure Preservation**: Create a professional, clean HTML version of the resume in the "formattedHtml" field. Use standard semantic tags (h1, h2, h3, p, ul, li). Ensure it reflects the ORIGINAL structure and hierarchy of the provided text.
      
      ### JSON OUTPUT FORMAT:
      {
        "isResume": boolean,
        "score": number,
        "summary": "Brief executive summary",
        "strengths": ["string"],
        "weaknesses": ["string"],
        "gaps": ["string"],
        "improvements": ["string"],
        "jobMatch": ["string"],
        "formattedHtml": "HTML string of the reconstructed resume"
      }


      Only return the JSON object. No preamble, no markdown formatting blocks, just the JSON.

      TEXT TO ANALYZE:
      ${resumeText}
    `;

    const result = await generateWithOllama(prompt);

    // Attempt to parse text to verify it's valid JSON
    let cleanText = result.text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    return {
      text: JSON.stringify(parsed),
      model: result.model
    };
  } catch (error) {
    console.error("Resume Analysis Error:", error);
    throw error;
  }
}


export async function getAtsScore(resumeText, jobDescription) {
  try {
    const prompt = `
      You are an expert ATS analyzer and Senior Technical Recruiter with 20 years of experience in Silicon Valley, specializing in FAANG and high-growth startups.
      
      Your task is to analyze the following resume against the provided job description and return a highly detailed, professional analysis in JSON format.
      
      ### GUIDELINES:
      - **Brutal Honesty**: Provide constructive but tough feedback.
      - **Athentic Extraction**: Extract real data (name, email, experience years).
      - **Actionable AI Suggestions**: Provide specific rewrites and improved bullet examples.
      - **Comprehensive Metrics**: Scores must be realistic, not inflated.
      
      ### JSON OUTPUT STRUCTURE:
      {
        "success": true,
        "isResume": true,
        "meta": {
          "analysisId": "ats_UUID",
          "generatedAt": "ISO_DATE",
          "modelVersion": "ats-v3.4"
        },
        "overallScore": 85,
        "scoreBreakdown": {
          "keywordMatch": 80,
          "formatScore": 90,
          "impactScore": 75,
          "readabilityScore": 85,
          "grammarScore": 95,
          "sectionCompleteness": 90
        },
        "summary": {
          "executiveSummary": "...",
          "strengths": ["..."],
          "weaknesses": ["..."]
        },
        "keywordAnalysis": {
          "matchedKeywords": ["..."],
          "missingKeywords": ["..."],
          "keywordDensity": 4.5
        },
        "sectionAnalysis": {
          "header": { "present": true, "score": 100, "suggestion": "..." },
          "experience": { "present": true, "score": 85, "suggestion": "..." },
          "skills": { "present": true, "score": 90, "suggestion": "..." },
          "education": { "present": true, "score": 100, "suggestion": "..." },
          "projects": { "present": true, "score": 70, "suggestion": "..." }
        },
        "formattingAnalysis": {
          "atsFriendly": true,
          "parseCompatibility": 95,
          "issues": ["..."]
        },
        "grammarAnalysis": {
          "errorCount": 2,
          "errors": [
            { "sentence": "...", "type": "...", "suggestion": "..." }
          ]
        },
        "impactAnalysis": {
          "actionVerbStrength": 80,
          "weakVerbs": ["..."],
          "recommendedVerbs": ["..."]
        },
        "jobMatchInsights": {
          "roleMatchPercentage": 85,
          "seniorityMatch": "Senior",
          "industryMatch": "Software Dev",
          "experienceGap": "..."
        },
        "aiSuggestions": {
          "improvedBulletExample": "...",
          "summaryRewrite": "..."
        },
        "atsSimulation": {
          "likelyShortlisted": true,
          "rankInTypicalPool": "Top 10%"
        },
        "marketBenchmark": {
          "percentileRank": 92,
          "salaryExpectationMatch": "High"
        },
        "competitiveEdge": {
          "advantageAreas": ["..."],
          "weakAgainstMarket": ["..."]
        },
        "parsedResume": {
          "name": "...",
          "email": "...",
          "phone": "...",
          "experienceYears": 5
        }
      }

      If the text is NOT a resume, return {"success": false, "isResume": false, "message": "friendly explanation"}.

      Only return the JSON object. No preamble, no markdown formatting blocks, just the JSON.

      RESUME TEXT:
      ${resumeText}

      JOB DESCRIPTION:
      ${jobDescription}
    `;

    const result = await generateWithOllama(prompt);

    // Attempt to parse text to verify it's valid JSON
    let cleanText = result.text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    return {
      text: JSON.stringify(parsed),
      model: result.model
    };
  } catch (error) {
    console.error("ATS Analyzer Error:", error);
    throw error;
  }
}

/**
 * Streams a chat response from Ollama.
 * @param {Array} messages - Chat history including system and user messages.
 * @returns {AsyncGenerator} - Ollama stream response.
 */
export async function streamChatWithOllama(messages, modelOverride = null) {
  try {
    return await ollama.chat({
      model: modelOverride || process.env.OLLAMA_MODEL || "gpt-oss:120b",
      messages: messages,
      stream: true,
    });
  } catch (error) {
    console.error("Ollama streaming error:", error);
    throw new Error(`Ollama streaming failed: ${error.message}`);
  }
}

/**
 * Lists available Ollama models.
 */
export async function listOllamaModels() {
  try {
    const response = await ollama.list();
    return response.models || [];
  } catch (error) {
    console.error("Error listing Ollama models:", error);
    return [];
  }
}

/**
 * Generates an embedding for a given text using Ollama.
 * @param {string} text - The input text.
 * @returns {Array<number>} - The embedding vector.
 */
export async function generateEmbedding(text) {
  try {
    const host = "http://localhost:11434";
    const endpoint = `${host}/api/embeddings`;

    const response = await axios.post(endpoint, {
      model: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text",
      prompt: text,
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // The response format for /api/embeddings is { embedding: [...] }
    return response.data.embedding;
  } catch (error) {
    console.error("Ollama embedding error:", error.response?.data || error.message);
    throw new Error(`Ollama embedding failed: ${error.message}`);
  }
}



export async function enhanceResumeByJD(resumeJson, jd) {
  try {
    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL || "gpt-oss:120b",
      messages: [{ role: "user", content: await getPrompt(resumeJson, jd) }],
      stream: false,
    });

    console.log("ai enhahcin resume based on jd-prompt", response.message.content)

    // clean markdown
    let cleanText = response.message.content.replace(/```json\n?|\n?```/g, "").trim();

    // parse to json
    const parsed = JSON.parse(cleanText);
    return parsed;

  } catch (error) {
    console.error("Enhance Resume AI Error:", error);
    throw error;
  }
}



export async function getPrompt(resumeJson, jd) {
  return `
You are an expert ATS Resume Writer, Technical Recruiter, and Career Coach.

Your task is to transform the candidate's resume according to the Job Description while preserving truthfulness and the original resume structure.

========================
JOB DESCRIPTION
========================

${jd}

========================
RESUME JSON
========================

${JSON.stringify(resumeJson, null, 2)}

========================
OBJECTIVES
========================

1. Analyze the Job Description to identify required/preferred skills, keywords, and ATS phrases.
2. Analyze the Resume.
3. Enhance the Professional Summary, Experience Bullet Points, Project Descriptions, and Skills Section.
4. IMPORTANT: Never invent companies, job titles, years of experience, or certifications. You may rewrite and strengthen wording.
5. ATS Optimization: Include relevant keywords naturally, improve action verbs, and highlight measurable impact.

========================
OUTPUT FORMAT
========================

Return ONLY valid JSON matching the exact structure below.

{
  "candidate_analysis": {
    "strengths": ["..."],
    "missing_keywords": ["..."],
    "ats_score_before": 0,
    "ats_score_after": 0
  },
  "enhanced_resume": {
    "name": "Candidate Name",
    "title": "Target Job Title based on JD",
    "contact": "City, State  •  +1 234 567 890  •  email@example.com  •  linkedin.com/in/username",
    "summary": "Enhanced professional summary...",
    "skills": [
      { "label": "Frontend", "value": "React, Next.js" }
    ],
    "experience": [
      {
        "title": "Role Title",
        "company": "Company Name",
        "period": "Start - End",
        "description": "Optional brief description...",
        "bullets": ["Enhanced bullet point 1", "Enhanced bullet point 2"]
      }
    ],
    "projects": [
      {
        "name": "Project Name",
        "link": "https://link",
        "period": "2023 - Present",
        "description": "Optional brief description...",
        "bullets": ["Enhanced bullet 1"]
      }
    ],
    "education": [
      {
        "degree": "Degree Name",
        "institution": "University Name",
        "period": "Expected 2026",
        "details": "Relevant coursework or GPA..."
      }
    ]
  }
}

DO NOT RETURN MARKDOWN.
DO NOT RETURN EXPLANATIONS.
RETURN RAW JSON ONLY.
`;
}