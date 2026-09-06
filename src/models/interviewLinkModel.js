import mongoose from "mongoose";

const interviewLinkSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    interviewId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ["technical", "mock", "practice"],
        required: true
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    
},{timestamps:true});

export default mongoose.model("InterviewLink", interviewLinkSchema);