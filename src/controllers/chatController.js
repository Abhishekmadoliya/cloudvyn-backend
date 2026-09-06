import { chat } from "../utils/llm/chat.js";
import { v4 as uuid } from "uuid";
import { generateWithOllama } from "../utils/llm/ollama.js";
import { extractTextFromPdf, chunkText } from "../utils/pdfProcessor.js";
import { storeDocumentChunks, searchContext } from "../services/vectorService.js";

/**
 * Handle PDF upload, extraction, and embedding storage
 */
export const uploadPdfController = async (req, res) => {
  const requestId = uuid();
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No file uploaded", requestId });
    }

    const { chatId, userId } = req.body;
    if (!userId) {
      return res.status(400).json({ ok: false, message: "userId is required", requestId });
    }

    console.log(`[PDF UPLOAD] Processing ${req.file.originalname} for user ${userId}`);

    // Extract text
    const text = await extractTextFromPdf(req.file.buffer);
    
    // Chunk text
    const chunks = chunkText(text);
    
    // Store in Vector DB
    await storeDocumentChunks(
      chunks, 
      { fileName: req.file.originalname, uploadedAt: new Date() },
      userId,
      chatId
    );

    return res.status(200).json({
      ok: true,
      message: "PDF processed and indexed successfully",
      chunks: chunks.length,
      requestId
    });

  } catch (error) {
    console.error("[PDF UPLOAD ERROR]", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to process PDF",
      error: error.message,
      requestId
    });
  }
};

/**
 * Stream response text chunk by chunk
 * Sends data as Server-Sent Events (SSE)
 */
export const streamAiResponse = async (req, res) => {
  const requestId = uuid();
  const startTime = Date.now();

  try {
    // Validate input
    const { prompt, history = [], mode = "chat", userId } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        ok: false,
        error: "INVALID_PROMPT",
        message: "A valid prompt string is required.",
        requestId,
      });
    }

    console.log(`[AI STREAM] Request ${requestId} received`);

    // PERFORM VECTOR SEARCH IF USER IS LOGGED IN
    let context = "";
    if (userId) {
      console.log(`[VECTOR SEARCH] Searching context for user ${userId}`);
      context = await searchContext(prompt, userId);
    }

    // Prepare prompt with context
    const enrichedPrompt = context 
      ? `CONTEXT FROM DOCUMENTS:\n${context}\n\nUSER QUESTION: ${prompt}\n\nPlease answer the question based on the context provided above. If the answer isn't in the context, use your general knowledge but mention that it wasn't in the documents.`
      : prompt;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Get LLM stream response
    let aiResponse;
    let fullResponse = "";

    try {
      aiResponse = await chat({ prompt: enrichedPrompt, history });
    } catch (error) {
      console.log("Primary LLM failed, trying Ollama fallback...");
      aiResponse = await generateWithOllama(enrichedPrompt, history);
    }

    // Extract text
    const responseText = aiResponse.text || aiResponse || "";
    fullResponse = responseText;

    // Stream the response in chunks
    const words = responseText.split(" ");
    for (let i = 0; i < words.length; i++) {
      const chunk = words[i] + (i < words.length - 1 ? " " : "");
      
      // Send chunk as SSE
      res.write(`data: ${JSON.stringify({
        type: "chunk",
        content: chunk,
        index: i,
      })}\n\n`);

      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    const responseTime = Date.now() - startTime;

    // Send completion event
    res.write(`data: ${JSON.stringify({
      type: "complete",
      requestId,
      model: aiResponse.model ?? "unknown",
      totalLength: fullResponse.length,
      tokens: aiResponse.tokens ?? {},
      timeMs: responseTime,
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error(`[AI STREAM] Error in request ${requestId}`, error);

    res.write(`data: ${JSON.stringify({
      type: "error",
      error: "LLM_ERROR",
      message: "The AI model failed to generate a response.",
      requestId,
    })}\n\n`);

    res.end();
  }
};

/**
 * Non-streaming response (fallback)
 */
export const getAiResponse = async (req, res) => {
  const requestId = uuid();
  const startTime = Date.now();

  try {
    // Validate input
    const { prompt, history = [], userId } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        ok: false,
        error: "INVALID_PROMPT",
        message: "A valid prompt string is required.",
        requestId,
      });
    }

    // Vector search
    let context = "";
    if (userId) {
      context = await searchContext(prompt, userId);
    }

    const enrichedPrompt = context 
      ? `CONTEXT FROM DOCUMENTS:\n${context}\n\nUSER QUESTION: ${prompt}`
      : prompt;

    // Call LLM with fallback
    let aiResponse;
    try {
      aiResponse = await chat({ prompt: enrichedPrompt, history });
    } catch (error) {
      console.log("Primary LLM failed, trying Ollama fallback...");
      aiResponse = await generateWithOllama(enrichedPrompt, history);
    }

    const responseTime = Date.now() - startTime;

    // Prepare response
    return res.status(200).json({
      ok: true,
      requestId,
      model: aiResponse.model ?? "unknown",
      response: aiResponse.text || aiResponse,
      tokens: aiResponse.tokens ?? {},
      timeMs: responseTime,
    });

  } catch (error) {
    console.error(`[AI] Error in request ${requestId}`, error);

    return res.status(500).json({
      ok: false,
      requestId,
      error: "LLM_ERROR",
      message: "The AI model failed to generate a response.",
    });
  }
};
