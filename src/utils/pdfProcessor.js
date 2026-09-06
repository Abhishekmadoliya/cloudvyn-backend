import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

/**
 * Extract text from PDF buffer
 */
export const extractTextFromPdf = async (buffer) => {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
};

/**
 * Split text into overlapping chunks
 */
export const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    // If not at the end, try to break at a newline or space
    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(" ", endIndex);
      const lastNewline = text.lastIndexOf("\n", endIndex);
      const breakPoint = Math.max(lastSpace, lastNewline);
      
      if (breakPoint > startIndex + chunkSize / 2) {
        endIndex = breakPoint;
      }
    }

    chunks.push(text.substring(startIndex, endIndex).trim());
    startIndex = endIndex - overlap;
    
    // Prevent infinite loop if overlap is too large or chunk is too small
    if (startIndex >= text.length || endIndex >= text.length) break;
  }

  return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
};
