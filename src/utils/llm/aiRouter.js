import { generateWithOllama } from './ollama.js';

export async function generateContent({ prompt, history = [], model, systemPrompt = null }) {
  console.log(`Routing request to Ollama for model: ${model}`);

  // Normalize model name for Ollama fallback if needed
  const modelLower = model.toLowerCase();
  
  // Map common frontend names to best available local models if possible
  let targetModel = model;
  if (modelLower.includes('gpt') || modelLower.includes('claude') || modelLower.includes('gemini')) {
    targetModel = process.env.OLLAMA_MODEL || "gpt-oss:120b";
  }

  // Route EVERYTHING to Ollama
  return await generateWithOllama(prompt, history, targetModel, systemPrompt);
}
