import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const chat = async ({ prompt, history }) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-25-flash",
    });

    const systemPrompt = `
You are an AI research assistant + technical interview prep teacher.
Provide accurate, concise, structured responses.
Focus on clarity, correctness, and depth.
Avoid hallucinations.
    `;

    // Convert history to Gemini format
    const formattedHistory = history.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...formattedHistory,
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    });

    return {
      text: result.response.text(),
      tokens: result.response.usageMetadata,
      model: "gemini-2.5-flash",
    };

  } catch (err) {
    throw err;
  }
};
