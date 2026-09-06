import express from "express";
import crypto from "crypto";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import Interview from "../../models/interviewModel.js";
import InterviewLink from "../../models/interviewLinkModel.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { checkEntitlement } from "../../middleware/checkEntitlement.js";
import { fetchGitHubCandidateData } from "../../services/github.service.js";
import { getCodingChallengeForInterview } from "../../services/codingChallenge.service.js";

const interviewRouter = express.Router();

// Configure multer for resume uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|txt|docx|doc)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX, and TXT files are allowed"), false);
    }
  },
});

/**
 * Endpoint to upload and extract text from candidate's resume for interview setup
 */
interviewRouter.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No resume file uploaded" });
    }

    const fileName = req.file.originalname;
    let extractedText = "";

    if (fileName.match(/\.pdf$/i) || req.file.mimetype === "application/pdf") {
      try {
        const parser = new PDFParse({ data: req.file.buffer });
        const parsed = await parser.getText();
        extractedText = parsed.text || "";
      } catch (pdfErr) {
        console.warn("PDF parser error, falling back to buffer string:", pdfErr.message);
        extractedText = req.file.buffer.toString("utf-8");
      }
    } else {
      // Plain text or utf-8 fallback
      extractedText = req.file.buffer.toString("utf-8");
    }

    // Clean up excessive whitespace
    extractedText = extractedText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (!extractedText) {
      return res.status(400).json({ success: false, message: "Could not extract text from the uploaded file." });
    }

    res.json({
      success: true,
      data: {
        text: extractedText,
        fileName,
        characterCount: extractedText.length,
      },
    });
  } catch (error) {
    console.error("Resume Upload Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to process resume file" });
  }
});

interviewRouter.post("/practice-interview-code", requireAuth, checkEntitlement, async (req, res) => {
  try {
    const interviewContext = req.body;
    console.log('Generating practice code for category:', interviewContext.category, 'Language:', interviewContext.language || 'en');

    const token = crypto.randomBytes(16).toString("hex");

    // If candidate provided a GitHub URL, fetch public profile & repositories
    let githubData = null;
    if (interviewContext.githubUrl && interviewContext.githubUrl.trim()) {
      try {
        githubData = await fetchGitHubCandidateData(interviewContext.githubUrl);
      } catch (ghErr) {
        console.warn("GitHub fetch error during setup (continuing):", ghErr.message);
      }
    }

    // Pre-generate coding challenge for technical interviews
    let initialProblem = null;
    const isTechnical = interviewContext.interviewType !== "oral" && interviewContext.category !== "management";
    if (isTechnical) {
      try {
        initialProblem = await getCodingChallengeForInterview({
          ...interviewContext,
          githubData
        });
      } catch (probErr) {
        console.warn("Could not pre-generate problem in setup route:", probErr.message);
      }
    }

    // Create the interview record with complete candidate context
    const interview = await Interview.create({
      userId: req.user.uid,
      interviewId: interviewContext.interviewId,
      category: interviewContext.category,
      interviewType: interviewContext.interviewType === "oral" ? "mock" : "technical",
      difficultyLevel: interviewContext.difficultyLevel || interviewContext.difficulty || "beginner",
      duration: interviewContext.duration || 20,
      status: "practice",
      softSkills: interviewContext.softSkills || [],
      interviewDescription: interviewContext.interviewDescription || "",
      targetRole: interviewContext.targetRole || "",
      skills: interviewContext.skills || [],
      topics: interviewContext.topics || [],
      customQuestions: interviewContext.customQuestions || [],
      wantsSystemDesign: Boolean(interviewContext.wantsSystemDesign),
      format: interviewContext.format || "voice",
      experience: interviewContext.experience || "",
      resumeText: interviewContext.resumeText || "",
      resumeFileName: interviewContext.resumeFileName || "",
      jobDescription: interviewContext.jobDescription || "",
      githubUrl: interviewContext.githubUrl || "",
      githubData: githubData || undefined,
      additionalLinks: Array.isArray(interviewContext.additionalLinks) ? interviewContext.additionalLinks.filter(Boolean) : [],
      language: interviewContext.language === "hi" ? "hi" : "en",
      currentProblem: initialProblem || undefined,
      codeLanguage: initialProblem?.starterCode?.html ? "html" : "javascript",
      currentCode: initialProblem?.starterCode?.javascript || "// Write your code here...\n",
    });

    // Create the interview link (slug)
    await InterviewLink.create({
      token,
      interviewId: interview.interviewId,
      type: "practice"
    });

    res.json({ success: true, data: { practiceCode: token } });
  } catch (error) {
    console.error("Error creating practice interview:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

interviewRouter.get("/practice-interview/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const interviewLink = await InterviewLink.findOne({ token });
    if (!interviewLink) {
      return res.status(404).json({ success: false, message: "Interview link not found" });
    }
    const interview = await Interview.findOne({ interviewId: interviewLink.interviewId });
    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    // If technical interview has no currentProblem attached yet, generate and attach it now
    if (!interview.currentProblem && interview.interviewType === "technical") {
      try {
        const problem = await getCodingChallengeForInterview(interview.toObject());
        if (problem) {
          interview.currentProblem = problem;
          await interview.save();
        }
      } catch (e) {
        console.warn("Error auto-attaching currentProblem in GET route:", e.message);
      }
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    console.error("Error getting practice interview:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export { interviewRouter };
