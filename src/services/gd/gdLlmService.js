import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import {
  buildPersonaSystemPrompt,
  buildUrgencyPrompt,
  buildGDReportPrompt,
} from "./gdPrompts.js";

// Initialize Gemini
let genAI = null;
let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

// Initialize Groq
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/**
 * Call Gemini primary model
 */
async function generateWithGemini(prompt, systemInstruction = null) {
  if (!geminiModel) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  const model = systemInstruction
    ? genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction,
      })
    : geminiModel;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Call DeepSeek fallback model (via HTTP request)
 */
async function generateWithDeepSeek(prompt, systemInstruction = null) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY missing");
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DeepSeek API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Call Groq secondary fallback model
 */
async function generateWithGroq(prompt, systemInstruction = null) {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await groq.chat.completions.create({
    messages,
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices?.[0]?.message?.content || "";
}

/**
 * Call Ollama Cloud / Local primary LLM model
 */
async function generateWithOllama(prompt, systemInstruction = null) {
  const host = (process.env.OLLAMA_CLOUD_URL || process.env.OLLAMA_URL || "https://api.ollama.com").replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL || "llama3.3";
  const apiKey = process.env.OLLAMA_API_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for response

  try {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Cloud API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.message?.content || data.response || "";
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Unified Fallback Runner: Ollama (Primary) -> Gemini (Fallback 1) -> DeepSeek (Fallback 2) -> Groq (Fallback 3)
 */
export async function callLlmWithFallback(prompt, systemInstruction = null) {
  const providers = [
    { name: "Ollama", fn: () => generateWithOllama(prompt, systemInstruction) },
    { name: "Gemini", fn: () => generateWithGemini(prompt, systemInstruction) },
    { name: "DeepSeek", fn: () => generateWithDeepSeek(prompt, systemInstruction) },
    { name: "Groq", fn: () => generateWithGroq(prompt, systemInstruction) },
  ];

  let lastError = null;
  for (const provider of providers) {
    try {
      console.log(`[GD LLM] Calling ${provider.name}...`);
      const result = await provider.fn();
      if (result && result.trim()) {
        console.log(`[GD LLM] ✅ ${provider.name} responded successfully`);
        return result.trim();
      }
    } catch (err) {
      console.warn(`[GD LLM] ⚠️ ${provider.name} failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`All GD LLM providers failed. Last error: ${lastError?.message}`);
}

/**
 * Generate Next AI Spoken Utterance in GD
 */
export async function generateAgentUtterance(agent, topic, transcriptSoFar) {
  const prompt = buildPersonaSystemPrompt(
    agent.persona || agent,
    topic,
    agent.stance || "neutral",
    transcriptSoFar
  );

  const response = await callLlmWithFallback(prompt);
  // Clean up quotes or markdown wrapper if model returns it
  return response.replace(/^["']|["']$/g, "").trim();
}

/**
 * Score Urgency in Parallel for All Idle Agents
 */
export async function scoreAgentUrgencyParallel(
  idleAgents,
  topic,
  lastUtterance,
  transcriptTail
) {
  if (!idleAgents || idleAgents.length === 0) return [];

  const scorePromises = idleAgents.map(async (agent) => {
    try {
      const silenceDuration = Math.round(
        (Date.now() - (agent.lastSpokeTimestamp || Date.now())) / 1000
      );
      const prompt = buildUrgencyPrompt(
        agent.persona || agent,
        topic,
        agent.stance || "neutral",
        lastUtterance,
        transcriptTail,
        silenceDuration
      );

      const rawResult = await callLlmWithFallback(prompt);
      const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { agent, urgency: 0.2, reason: "none", one_line_intent: "" };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      // Apply archetype urgency bias
      const bias = agent.persona?.urgency_bias || agent.urgency_bias || 0;
      const finalUrgency = Math.min(1.0, Math.max(0.0, (parsed.urgency || 0.3) + bias));

      return {
        agent,
        urgency: finalUrgency,
        reason: parsed.reason || "none",
        one_line_intent: parsed.one_line_intent || "",
      };
    } catch (err) {
      console.warn(`[GD LLM] Urgency scoring error for ${agent.name}:`, err.message);
      return { agent, urgency: 0.2, reason: "none", one_line_intent: "" };
    }
  });

  return Promise.all(scorePromises);
}

/**
 * Generate Comprehensive GD Performance Report
 */
export async function generateGDReportLLM(topic, humanName, transcript, durationSeconds) {
  const formattedTranscript = transcript
    .map((t) => `[${t.speakerName} (${t.archetype || t.speakerType})]: ${t.text}`)
    .join("\n");

  const prompt = buildGDReportPrompt(topic, humanName, formattedTranscript, durationSeconds);
  const rawResponse = await callLlmWithFallback(prompt);

  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse JSON from GD report LLM response");
  }

  const reportData = JSON.parse(jsonMatch[0]);
  return reportData;
}
