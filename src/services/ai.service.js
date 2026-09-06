import { geminiModel } from "../config/gemini.js";
import { buildPrompt } from "./prompt.service.js";

export async function getPrediction(text) {
  const prompt = buildPrompt(text);

  const result = await geminiModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 30,
      temperature: 0.3,
      stopSequences: ["\n"],
    },
  });

  return result.response.text() || "";
}
