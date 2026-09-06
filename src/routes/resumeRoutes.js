import express from "express";
import multer from "multer";
import { analyzeResume, atsAnalyzer,enhanceResume } from "../controllers/resumeController.js";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX and TXT files are allowed"), false);
    }
  },
});

router.post("/analyze", upload.single("resume"), analyzeResume);


router.post("/ats-analyzer", upload.single("resume"), atsAnalyzer);

router.post("/enhance-by-jd",upload.single("resume"),enhanceResume)

export default router;
