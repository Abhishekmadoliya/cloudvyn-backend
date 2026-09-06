import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema({
    userId: {
        type: String, // Storing Firebase UID
        required: true,
        index: true
    },
    interviewId: {
        type: String,
        required: true,
        unique: true, // Ensures no duplicates
        index: true
    },
    category: {
        type: String, // e.g., "frontend-react", "backend-node"
        required: true
    },
    interviewType: {
        type: String, // "technical" or "mock"
        enum: ["technical", "mock"],
        required: true
    },
    difficultyLevel: {
        type: String,
        enum: ["beginner", "intermediate", "expert", "advanced"],
        default: "beginner"
    },
    status: {
        type: String,
        enum: ["started", "completed", "cancelled", "failed", "practice"],
        default: "started"
    },
    quotaDeducted: {
        type: Boolean,
        default: false,
        index: true
    },
    transcript: [{
        role: { type: String, enum: ["user", "ai", "system"] },
        content: String,
        timestamp: Date
    }],
    feedback: {
        score: Number,
        feedback: String,
        areasForImprovement: [String]
    },
    score: {
        type: Number,
        default: 0
    },
    duration: Number, // In seconds
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    softSkills: [String],
    interviewDescription: String,
    targetRole: String,
    skills: [String],
    topics: [String],
    customQuestions: [String],
    wantsSystemDesign: Boolean,
    format: String,
    experience: String,
    resumeText: String,
    resumeFileName: String,
    jobDescription: String,
    githubUrl: String,
    githubData: {
        username: String,
        name: String,
        bio: String,
        publicReposCount: Number,
        topRepos: [{
            name: String,
            description: String,
            language: String,
            stars: Number,
            forks: Number,
            topics: [String],
            url: String
        }]
    },
    additionalLinks: [String],
    language: {
        type: String,
        enum: ["en", "hi"],
        default: "en"
    },
    currentProblem: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    currentCode: {
        type: String,
        default: ""
    },
    codeLanguage: {
        type: String,
        default: "javascript"
    },
});

export default mongoose.model("Interview", interviewSchema);