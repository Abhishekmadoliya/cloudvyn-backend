import express from "express";
import { requireAdminAuth } from "../../middleware/requireAuth.js";
import Interview from "../../models/interviewModel.js";
import userModel from "../../models/userModel.js";

const interviewAdminRouter = express.Router();

// Enforce admin authentication
interviewAdminRouter.use(requireAdminAuth);

/**
 * GET /api/admin/interviews/all
 * Fetch all candidate AI interview sessions with transcript & candidate details
 */
interviewAdminRouter.get("/all", async (req, res) => {
  try {
    const interviews = await Interview.find({}).sort({ createdAt: -1 });

    // Extract unique Firebase UIDs to populate user information
    const uids = [...new Set(interviews.map((i) => i.userId).filter(Boolean))];
    const users = await userModel.find({ firebaseUid: { $in: uids } }).select("firebaseUid username email profileImage");

    const userMap = {};
    users.forEach((u) => {
      userMap[u.firebaseUid] = u;
    });

    const enrichedInterviews = interviews.map((inv) => {
      const candidate = userMap[inv.userId] || { username: "Candidate", email: inv.userId };
      return {
        _id: inv._id,
        interviewId: inv.interviewId,
        candidate: {
          firebaseUid: inv.userId,
          username: candidate.username,
          email: candidate.email,
          profileImage: candidate.profileImage,
        },
        category: inv.category,
        interviewType: inv.interviewType,
        difficultyLevel: inv.difficultyLevel,
        status: inv.status,
        transcript: inv.transcript || [],
        feedback: inv.feedback || null,
        duration: inv.duration || 0,
        createdAt: inv.createdAt,
        completedAt: inv.completedAt || inv.createdAt,
        targetRole: inv.targetRole,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Fetched all candidate AI interviews",
      data: enrichedInterviews,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/interviews/all:", error);
    return res.status(500).json({ success: false, message: "Server error fetching interviews" });
  }
});

/**
 * GET /api/admin/interviews/:id
 * Fetch single interview detail with full transcript
 */
interviewAdminRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const interview = await Interview.findOne({ $or: [{ _id: id }, { interviewId: id }] });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview session not found" });
    }

    const candidate = await userModel.findOne({ firebaseUid: interview.userId }).select("username email profileImage");

    return res.status(200).json({
      success: true,
      data: {
        ...interview.toObject(),
        candidate: candidate || { username: "Candidate", email: interview.userId },
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/interviews/:id:", error);
    return res.status(500).json({ success: false, message: "Server error fetching interview session" });
  }
});

export default interviewAdminRouter;
