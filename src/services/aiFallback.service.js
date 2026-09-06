import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Ollama } from "ollama";

// Configuration
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || "https://ollama.com",
  headers: {
    Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
  },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite", 
});

// Primary LLM Generation Functions
async function generateWithGemini(prompt) {
  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}

async function generateWithOllama(prompt) {
  const response = await ollama.chat({
    model: process.env.OLLAMA_MODEL || "gpt-oss:120b",
    messages: [{ role: "user", content: prompt }],
    stream: false,
  });
  return response.message.content;
}

async function generateWithGroq(prompt) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
    max_tokens: 300,
    top_p: 1,
    stream: false,
  });
  return chatCompletion.choices[0]?.message?.content || "";
}

/**
 * Fallback chain for content generation (questions, responses, etc)
 */
export async function generateWithFallback(prompt, context = null) {
  // ... existing code ...
  const contextualizedPrompt = applyContextToPrompt(prompt, context);

  const generators = [
    { name: "Gemini", generate: () => generateWithGemini(contextualizedPrompt) },
    { name: "Ollama", generate: () => generateWithOllama(contextualizedPrompt) },
    { name: "Groq LLM", generate: () => generateWithGroq(contextualizedPrompt) }
  ];

  for (const generator of generators) {
    try {
      console.log(`🔄 Trying ${generator.name} for content generation...`);
      const result = await generator.generate();
      if (result && result.trim().length > 0) {
        console.log(`✅ ${generator.name} successfully generated content`);
        return result;
      }
    } catch (error) {
      console.log(`⚠️ ${generator.name} failed:`, error.message);
    }
  }
  
  throw new Error("All LLM models failed to generate content");
}

/**
 * Streams content generation using a fallback chain.
 * @param {string} prompt 
 * @param {object} context 
 * @param {function} onToken Callback for each token
 * @returns {Promise<string>} The full text once finished
 */
export async function streamGenerateWithFallback(prompt, context = null, onToken) {
  const contextualizedPrompt = applyContextToPrompt(prompt, context);

  // For now, we'll prioritize Groq for streaming as it's very fast
  try {
    console.log("🔄 Starting Groq LLM stream...");
    const stream = await groq.chat.completions.create({
      messages: [{ role: "user", content: contextualizedPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 300,
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        onToken(content);
      }
    }
    console.log("✅ Groq LLM stream completed");
    return fullText;
  } catch (error) {
    console.warn("⚠️ Groq streaming failed, falling back to Gemini streaming:", error.message);
    // Fallback: stream with Gemini
    try {
      console.log("🔄 Starting Gemini stream fallback...");
      const result = await geminiModel.generateContentStream(contextualizedPrompt);
      let fullText = "";
      for await (const chunk of result.stream) {
        const content = chunk.text();
        if (content) {
          fullText += content;
          onToken(content);
        }
      }
      console.log("✅ Gemini stream fallback completed");
      return fullText;
    } catch (geminiErr) {
      console.warn("⚠️ Gemini streaming also failed, using Ollama non-streaming:", geminiErr.message);
      const fullText = await generateWithOllama(contextualizedPrompt);
      onToken(fullText);
      return fullText;
    }
  }
}

function applyContextToPrompt(prompt, context) {
  if (!context) return prompt;
  
  const { remainingTime, duration } = context;
  let timeInstruction = "";
  
  if (remainingTime !== undefined) {
    const minsLeft = Math.floor(remainingTime / 60);
    if (remainingTime < 120) {
      timeInstruction = `\n\nCRITICAL TIME UPDATE: There are only ${minsLeft} minutes and ${remainingTime % 60} seconds remaining. You must wrap up. Ask one final, brief question or provide a concluding remark. Do not start a new complex topic. Explicitly mention the time remaining to the user.`;
    } else {
      timeInstruction = `\n\nTime Update: ${minsLeft} minutes remaining. Pace the interview accordingly.`;
    }
  }

  return `${prompt}\n\nInterview Context:\n${JSON.stringify(context, null, 2)}${timeInstruction}`;
}
