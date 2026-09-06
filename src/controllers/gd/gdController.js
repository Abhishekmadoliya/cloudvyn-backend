import GDTopic from "../../models/gd/gdTopicModel.js";
import GDSession from "../../models/gd/gdSessionModel.js";
import { v4 as uuidv4 } from "uuid";
import { finalizeGdSession, initGdRoom } from "../../services/gd/gdOrchestrator.js";

/**
 * Seed initial standard Group Discussion topics
 */
export const seedTopics = async (req, res) => {
  try {
    const seedData = [
      {
        text: "Should India adopt a 4-day work week?",
        category: "current_affairs",
        difficulty: "medium",
        suggestedStances: ["for", "against", "neutral"],
        tags: ["workplace", "economy", "productivity"],
        isSeed: true,
      },
      {
        text: "Will Generative AI replace junior software engineers or supercharge them?",
        category: "case_study",
        difficulty: "hard",
        suggestedStances: ["replace", "supercharge", "nuanced"],
        tags: ["ai", "tech", "employment"],
        isSeed: true,
      },
      {
        text: "Work from Home vs. Return to Office: What is the optimal hybrid formula?",
        category: "current_affairs",
        difficulty: "easy",
        suggestedStances: ["wfh_preference", "rto_preference", "hybrid"],
        tags: ["corporate", "culture", "flexibility"],
        isSeed: true,
      },
      {
        text: "Is Moonlighting ethical in the IT industry?",
        category: "controversial",
        difficulty: "medium",
        suggestedStances: ["unethical", "acceptable", "conditional"],
        tags: ["ethics", "it_industry", "careers"],
        isSeed: true,
      },
      {
        text: "Should college education focus on practical skills over academic degrees?",
        category: "abstract",
        difficulty: "medium",
        suggestedStances: ["practical_skills", "academic_degrees", "both"],
        tags: ["education", "skills", "placement"],
        isSeed: true,
      },
      {
        text: "Data Privacy vs. National Security: Where should governments draw the line?",
        category: "controversial",
        difficulty: "hard",
        suggestedStances: ["privacy_first", "security_first", "balanced"],
        tags: ["cybersecurity", "policy", "tech"],
        isSeed: true,
      },
    ];

    for (const item of seedData) {
      await GDTopic.updateOne(
        { text: item.text },
        { $set: item },
        { upsert: true }
      );
    }

    const allTopics = await GDTopic.find();
    return res.status(200).json({
      success: true,
      message: "Seed GD topics initialized successfully",
      count: allTopics.length,
      topics: allTopics,
    });
  } catch (error) {
    console.error("[GD Controller] Seed topics error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all available GD topics with optional filters
 */
export const getTopics = async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      filter.text = { $regex: search, $options: "i" };
    }

    const topics = await GDTopic.find(filter).sort({ usageCount: -1, createdAt: -1 });
    return res.status(200).json({ success: true, count: topics.length, topics });
  } catch (error) {
    console.error("[GD Controller] Get topics error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create a new GD Session
 */
export const createSession = async (req, res) => {
  try {
    const { userId, topicId, customTopic, category, durationSeconds, userName, userStance } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: "userId is required" });
    }

    const sessionId = `gd_session_${uuidv4()}`;

    const room = await initGdRoom(sessionId, userId, {
      topicId,
      customTopic,
      category,
      durationSeconds: durationSeconds || 600,
      userName: userName || "Candidate",
      userStance: userStance || "neutral",
    });

    return res.status(201).json({
      success: true,
      message: "GD session created successfully",
      session: {
        sessionId: room.sessionId,
        topic: room.topic,
        durationSeconds: room.durationSeconds,
        status: room.status,
        participants: room.participants.map((p) => ({
          id: p.agentInstanceId || p.userId || p.name,
          name: p.name,
          type: p.type,
          archetype: p.archetype,
          stance: p.stance,
        })),
      },
    });
  } catch (error) {
    console.error("[GD Controller] Create session error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get details of a GD session by ID
 */
export const getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await GDSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ success: false, error: "GD session not found" });
    }

    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error("[GD Controller] Get session by ID error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all GD sessions for a specific user
 */
export const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await GDSession.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    console.error("[GD Controller] Get user sessions error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generate or Regenerate Report for completed GD session
 */
export const generateReport = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await finalizeGdSession(sessionId);

    return res.status(200).json({
      success: true,
      message: "GD evaluation report generated successfully",
      report: session.report,
      metrics: session.metrics,
      transcript: session.transcript,
    });
  } catch (error) {
    console.error("[GD Controller] Generate report error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
