import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["human", "ai_agent"],
      required: true,
    },
    userId: { type: String }, // Firebase UID or User ObjectId string if human
    agentInstanceId: { type: String }, // e.g. "agent_1"
    name: { type: String, required: true },
    archetype: {
      type: String,
      enum: ["dominant", "analytical", "consensus_builder", "contrarian"],
    },
    stance: {
      type: String,
      enum: ["for", "against", "neutral"],
      default: "neutral",
    },
    voiceId: { type: String },
    consecutiveTurns: { type: Number, default: 0 },
  },
  { _id: false }
);

const transcriptTurnSchema = new mongoose.Schema(
  {
    turnIndex: { type: Number, required: true },
    speakerId: { type: String, required: true },
    speakerName: { type: String, required: true },
    speakerType: {
      type: String,
      enum: ["human", "ai_agent"],
      required: true,
    },
    archetype: { type: String },
    text: { type: String, required: true },
    startMs: { type: Number, default: 0 },
    endMs: { type: Number, default: 0 },
    interrupted: { type: Boolean, default: false },
    interruptedBy: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const participantMetricSchema = new mongoose.Schema(
  {
    speakerId: { type: String },
    name: { type: String },
    speakingTimeMs: { type: Number, default: 0 },
    speakingTimeSharePct: { type: Number, default: 0 },
    turnCount: { type: Number, default: 0 },
    interruptionsMade: { type: Number, default: 0 },
    interruptionsReceived: { type: Number, default: 0 },
    avgTurnLengthWords: { type: Number, default: 0 },
    newPointsIntroduced: { type: Number, default: 0 },
    pointsBuiltOn: { type: Number, default: 0 },
    agreementShiftsCaused: { type: Number, default: 0 },
  },
  { _id: false }
);

const gdReportSchema = new mongoose.Schema(
  {
    generatedAt: { type: Date, default: Date.now },
    model: { type: String, default: "gemini-2.0-flash" },
    overallScore: { type: Number, default: 0 },
    rubricScores: {
      communication: { type: Number, default: 0 },
      contentAndKnowledge: { type: Number, default: 0 },
      groupDynamics: { type: Number, default: 0 },
      leadershipAndInitiative: { type: Number, default: 0 },
      structureAndClarity: { type: Number, default: 0 },
    },
    strengths: [{ type: String }],
    improvementAreas: [{ type: String }],
    actionableAdvice: [{ type: String }],
    fullTranscriptSummary: { type: String },
  },
  { _id: false }
);

const gdSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "abandoned"],
      default: "scheduled",
    },
    topic: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "GDTopic" },
      text: { type: String, required: true },
      category: { type: String, default: "current_affairs" },
    },
    durationSeconds: {
      type: Number,
      default: 600,
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    participants: [participantSchema],
    transcript: [transcriptTurnSchema],
    metrics: {
      perParticipant: [participantMetricSchema],
    },
    report: gdReportSchema,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("GDSession", gdSessionSchema, "gd_sessions");
