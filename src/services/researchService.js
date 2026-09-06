import { generateEmbedding } from '../utils/llm/ollama.js';
import { generateContent } from '../utils/llm/aiRouter.js';
import DocumentChunk from '../models/documentModel.js';
import { PDFParse } from 'pdf-parse';
import fs from 'fs';

class ResearchService {
  /**
   * Processes a source file: extracts text, chunks it, embeds it, and stores it in MongoDB.
   */
  async processSource(file, type, sessionId, userId) {
    console.log(`Processing ${type} source for session ${sessionId}...`);
    
    let text = '';
    if (type === 'PDF') {
      const dataBuffer = fs.readFileSync(file.path);
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      text = result.text;
      await parser.destroy();
    } else {
      text = fs.readFileSync(file.path, 'utf8');
    }

    const chunks = this.chunkText(text, 1000, 200);
    const sourceId = Math.random().toString(36).substr(2, 9);

    console.log(`Generated ${chunks.length} chunks for source ${file.originalname}`);

    // Generate embeddings and store in parallel
    const storePromises = chunks.map(async (chunk, index) => {
      const embedding = await generateEmbedding(chunk.content);
      return new DocumentChunk({
        userId,
        chatId: sessionId,
        content: chunk.content,
        embedding,
        metadata: {
          fileName: file.originalname,
          pageNumber: Math.floor(index / 3) + 1, 
          chunkIndex: index,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          sourceId
        }
      }).save();
    });

    await Promise.all(storePromises);

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    return {
      id: sourceId,
      name: file.originalname,
      type: type,
      status: 'ready',
      topics: this.extractTopics(text.substring(0, 5000)),
      summary: "Document successfully indexed for semantic search."
    };
  }

  chunkText(text, size, overlap) {
    const lines = text.split('\n');
    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        currentChunk.push(line);
        currentLength += line.length + 1; // +1 for newline

        if (currentLength >= size) {
            chunks.push({
                content: currentChunk.join('\n'),
                startLine: startLine,
                endLine: i + 1
            });

            // Handle overlap (keep last few lines)
            const overlapLines = Math.floor(overlap / (size / currentChunk.length || 1));
            const keepCount = Math.max(1, overlapLines);
            currentChunk = currentChunk.slice(-keepCount);
            currentLength = currentChunk.join('\n').length;
            startLine = i + 1 - keepCount + 1;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n'),
            startLine: startLine,
            endLine: lines.length
        });
    }

    return chunks;
  }

  extractTopics(text) {
    const possibleTopics = ['Artificial Intelligence', 'Machine Learning', 'Neural Networks', 'Systems Architecture', 'Scalability', 'Security', 'User Experience'];
    return possibleTopics.filter(topic => text.toLowerCase().includes(topic.toLowerCase())).slice(0, 3);
  }

  /**
   * Performs semantic search using MongoDB Vector Search
   */
  async searchContext(query, sessionId, limit = 5) {
    const embedding = await generateEmbedding(query);
    
    // Note: This requires a vector search index named "vector_index" on the "documentchunks" collection
    // with "embedding" field configured as "knnVector" (dimensions: 1536, similarity: "cosine")
    const results = await DocumentChunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index", 
          path: "embedding",
          queryVector: embedding,
          numCandidates: limit * 10,
          limit: limit,
          filter: { chatId: sessionId }
        }
      },
      {
        $project: {
          content: 1,
          metadata: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]);

    return results;
  }

  async chat(prompt, sessionId, model, userId) {
    // 1. Get relevant context via Vector Search
    const searchResults = await this.searchContext(prompt, sessionId);
    
    const context = searchResults.map(res => 
      `[Source: ${res.metadata.fileName}, Page: ${res.metadata.pageNumber}, Lines: ${res.metadata.startLine}-${res.metadata.endLine}]\n${res.content}`
    ).join('\n\n');
 
     const systemInstruction = `
       You are a strict Research Assistant. 
       Your ONLY source of information is the provided CONTEXT below. 
       If the answer is not in the context, you MUST say: "I'm sorry, but I couldn't find information about that in your uploaded documents."
       Do NOT use your internal knowledge. Do NOT mention yourself as an AI. 
       ALWAYS provide citations using the EXACT format [Source Name: Page X, Lines Y-Z] for every claim.
       
       CONTEXT:
       ${context}
     `;


     console.log("systemInstruction", systemInstruction);
     console.log("context", context);
     
 
     const response = await generateContent({ 
       prompt, 
       history: [], 
       model, 
       systemPrompt: systemInstruction 
     });
     
     return {
       text: response.text,
       citations: searchResults.map(res => ({
         source: res.metadata.fileName,
         page: res.metadata.pageNumber,
         lines: `${res.metadata.startLine}-${res.metadata.endLine}`
       }))
     };
  }

  async performStudioTask(task, sessionId) {
    const searchResults = await this.searchContext(task, sessionId, 10);
    const context = searchResults.map(res => res.content).join('\n');
    
    const prompt = `Research Task: ${task}\n\nRelevant Context:\n${context}\n\nProvide a detailed specialized output for this task.`;
    const response = await generateContent({
      prompt,
      history: [],
      model: "gpt-oss:120b",
      systemPrompt: null
    });
    return response.text;
  }
}

export const researchService = new ResearchService();
