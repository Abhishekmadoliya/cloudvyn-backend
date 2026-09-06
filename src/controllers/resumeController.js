
import { PDFParse } from "pdf-parse";
import { anaylzeResumeWithOllama, enhanceResumeByJD, getAtsScore } from "../utils/llm/ollama.js";
import dotenv from "dotenv";
import { buildResumeJSON, classifyResumeContent, extractStructuredContent } from "../utils/pdfExtractor.js";

dotenv.config();

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const dataBuffer = req.file.buffer;
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    const resumeText = data.text;

    const ollamaResult = await anaylzeResumeWithOllama(resumeText);
    let text = ollamaResult.text;

    // Clean JSON response (sometimes LLMs wrap it in markdown)
    text = text.replace(/```json\n?|\n?```/g, "").trim();

    const analysis = JSON.parse(text);

    if (analysis.isResume === false) {
      return res.status(400).json({
        message: "The uploaded document does not appear to be a resume.",
        details: analysis.summary
      });
    }

    res.status(200).json({
      ...analysis,
      resumeText // Include original text for editing
    });


  } catch (error) {
    console.error("Resume Analysis Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

export const atsAnalyzer = async (req, res) => {
  try {
    console.log("ATS Analyzer Request Received");
    console.log("File:", req.file ? { name: req.file.originalname, size: req.file.size } : "No File");
    console.log("Body:", req.body);

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const dataBuffer = req.file.buffer;
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    const resumeText = data.text;

    const ollamaResult = await getAtsScore(resumeText, req.body.job_description);
    let text = ollamaResult.text;

    // Clean JSON response (sometimes LLMs wrap it in markdown)
    text = text.replace(/```json\n?|\n?```/g, "").trim();

    const analysis = JSON.parse(text);

    if (analysis.isResume === false) {
      return res.status(400).json({
        message: analysis.message || "The uploaded document does not appear to be a resume.",
        details: analysis.summary
      });
    }

    res.status(200).json({
      ...analysis,
      meta: {
        ...analysis.meta,
        analysisId: analysis.meta?.analysisId || `ats_${Date.now()}`
      }
    });

  } catch (error) {
    console.error("Resume Analysis Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}


export const enhanceResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "resume not found" });
    }

    const dataBuffer = req.file.buffer;
    let resumeContent = "";

    try {
      // Use PDFParse to safely extract text from the buffer
      const parser = new PDFParse({ data: dataBuffer });
      const data = await parser.getText();
      resumeContent = data.text;
    } catch (parseErr) {
      console.error("PDF Parsing Error:", parseErr);
      return res.status(400).json({ message: "Invalid PDF file uploaded", error: parseErr.message });
    }

    // enhance with api
    const getEnhanced = await enhanceResumeByJD({ text: resumeContent }, req.body.job_description)
    console.log("Enhanced JSON:", getEnhanced);
    
    // Import and generate DOCX
    const { generateResumeDocx } = await import("../utils/docxGenerator.js");
    let docxBuffer = null;
    let base64File = null;

    try {
      const resumeDataToUse = getEnhanced.enhanced_resume || getEnhanced;
      docxBuffer = await generateResumeDocx(resumeDataToUse);
      base64File = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBuffer.toString("base64")}`;
    } catch (docxErr) {
      console.error("DOCX Generation Error:", docxErr);
    }

    res.status(200).json({
      ...getEnhanced,
      resumeContent,
      file: base64File
    });


  } catch (error) {
    console.error("Resume Analysis Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}