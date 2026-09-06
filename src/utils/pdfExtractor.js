import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Required for Node.js — disables worker (commented out as it crashes pdfjs-dist v6)
// pdfjsLib.GlobalWorkerOptions.workerSrc = "";

/**
 * Extracts structured text from a PDF buffer using pdfjs-dist.
 * Each item includes text, fontSize, position (x, y), and bold flag.
 */
export async function extractStructuredContent(pdfBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;

  const pages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items = textContent.items.map((item) => {
      const transform = item.transform;
      // transform = [scaleX, skewX, skewY, scaleY, x, y]
      const fontSize = Math.abs(transform[3]); // scaleY ≈ font size
      const x = transform[4];
      const y = transform[5];
      const isBold = item.fontName?.toLowerCase().includes("bold");

      return {
        text: item.str.trim(),
        fontSize: Math.round(fontSize),
        x: Math.round(x),
        y: Math.round(y),
        isBold,
        fontName: item.fontName,
      };
    });

    // Filter empty strings
    const filtered = items.filter((i) => i.text.length > 0);

    pages.push({ pageNum, items: filtered });
  }

  return pages;
}

/**
 * Converts extracted pages into a resume-aware structure.
 * Detects headings by font size relative to body text.
 */
export function classifyResumeContent(pages) {
  const allItems = pages.flatMap((p) => p.items);

  // Find the most common font size (body text)
  const fontSizeFreq = {};
  allItems.forEach((item) => {
    fontSizeFreq[item.fontSize] = (fontSizeFreq[item.fontSize] || 0) + 1;
  });
  const bodyFontSize = parseInt(
    Object.entries(fontSizeFreq).sort((a, b) => b[1] - a[1])[0][0]
  );

  // Group items into lines by Y position (within 2px = same line)
  const lines = [];
  let currentLine = [];
  let lastY = null;

  const sorted = [...allItems].sort((a, b) =>
    a.y !== b.y ? b.y - a.y : a.x - b.x
  );

  for (const item of sorted) {
    if (lastY === null || Math.abs(item.y - lastY) <= 2) {
      currentLine.push(item);
    } else {
      if (currentLine.length) lines.push(currentLine);
      currentLine = [item];
    }
    lastY = item.y;
  }
  if (currentLine.length) lines.push(currentLine);

  // Classify each line
  const classified = lines.map((line) => {
    const text = line.map((i) => i.text).join(" ");
    const maxFontSize = Math.max(...line.map((i) => i.fontSize));
    const hasBold = line.some((i) => i.isBold);

    let type = "body";
    if (maxFontSize > bodyFontSize + 4) type = "name"; // largest = name/title
    else if (maxFontSize > bodyFontSize + 1 || hasBold) type = "heading";

    return { text, type, fontSize: maxFontSize, isBold: hasBold };
  });

  return classified;
}

/**
 * Converts classified lines into a clean JSON structure for AI.
 */
export function buildResumeJSON(classifiedLines) {
  const resume = { sections: [] };
  let currentSection = null;

  for (const line of classifiedLines) {
    if (!line.text) continue;

    if (line.type === "name") {
      resume.header = line.text;
    } else if (line.type === "heading") {
      currentSection = { title: line.text, content: [] };
      resume.sections.push(currentSection);
    } else {
      if (!currentSection) {
        currentSection = { title: "intro", content: [] };
        resume.sections.push(currentSection);
      }
      currentSection.content.push(line.text);
    }
  }

  return resume;
}