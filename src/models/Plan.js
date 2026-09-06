import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: ["free", "plus", "pro"],
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  priceInPaise: {
    type: Number,
    required: true,
  },
  interviewCap: {
    type: Number,
    required: true,
  },
  allowBYOK: {
    type: Boolean,
    default: false,
  },
  languages: {
    type: [String],
    default: ["en"],
  },
  features: {
    codeEditor: { type: Boolean, default: false },
    transcriptDownload: { type: Boolean, default: false },
    videoDownload: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
  },
  active: {
    type: Boolean,
    default: true,
  },
});

export default mongoose.model("Plan", planSchema);
