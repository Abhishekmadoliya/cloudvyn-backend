import { GoogleGenerativeAI } from "@google/generative-ai";
import DocumentChunk from "../models/documentModel.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate vector embeddings using Gemini API
 */
export const generateEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding generation error:", error);
    throw new Error("Failed to generate embedding");
  }
};

/**
 * Store chunks with embeddings in MongoDB
 */
export const storeDocumentChunks = async (chunks, metadata, userId, chatId = null) => {
  const operations = await Promise.all(
    chunks.map(async (content, index) => {
      const embedding = await generateEmbedding(content);
      return {
        userId,
        chatId,
        content,
        embedding,
        metadata: {
          ...metadata,
          chunkIndex: index,
        },
      };
    })
  );

  await DocumentChunk.insertMany(operations);
};

/**
 * Search for relevant context using MongoDB Atlas Vector Search
 */
export const searchContext = async (query, userId, limit = 5) => {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const results = await DocumentChunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit: limit,
          filter: { userId: userId }
        }
      },
      {
        $project: {
          content: 1,
          score: { $meta: "vectorSearchScore" },
          metadata: 1
        }
      }
    ]);

    return results.map(r => r.content).join("\n\n---\n\n");
  } catch (error) {
    console.error("Vector search error:", error);
    return ""; // Return empty context on error gracefully
  }
};
