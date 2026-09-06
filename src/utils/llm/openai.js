import OpenAI from "openai";
import { configDotenv } from "dotenv";

configDotenv();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates an embedding for a given text.
 * @param {string} text - The input text.
 * @returns {Array<number>} - The 1536-dimensional embedding vector.
 */
export async function generateEmbedding(text) {
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
            encoding_format: "float",
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}

/**
 * Generates a chat response using OpenAI.
 */
export async function generateWithOpenAI(prompt, history = [], modelOverride = null, customSystemPrompt = null) {
  try {
    const defaultSystem = "You are an AI research assistant. Provide accurate, concise, structured responses based on the context if provided.";
    const systemPrompt = customSystemPrompt || defaultSystem;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content || msg.text || ''
      })),
      { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
      model: modelOverride || "gpt-4o",
      messages: messages,
    });

    return {
      text: response.choices[0].message.content,
      model: modelOverride || "gpt-4o"
    };
  } catch (error) {
    console.error("OpenAI generation error:", error);
    throw new Error(`OpenAI failed: ${error.message}`);
  }
}
