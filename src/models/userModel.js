import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  firebaseUid: { type: String, unique: true, index: true },

  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  bio: {
    type: String,
    default: "No bio added yet",
  },
  // password: {
  //   type: String,
  //   required: true,
  //   minlength: [8, 'Password must be at least 8 characters long.'],
  //   maxlength: [20, 'Password cannot exceed 20 characters.']
  // },
  role: {
    type: String,
    enum: ["user", "admin", "recruiter", "candidate", "Admin"],
    default: "user",
  },
  designation: {
    type: String,
  },
  dob: {
    type: Date,
  },
  interestedIn: [
    {
      type: String,
    },
  ],
  isActive: {
    type: String,
    enum: ["true", "false"],
    default: "true",
  },
  skills: [String],
  socials: [
    {
      platform: {
        type: String,
        enum: ["instagram", "tiktok", "twitter", "youtube", "github", "stackoverflow", "codeforces", "leetcode", "geeksforgeeks", "linkdln"]
      },
      url: String
    }
  ],
  designation: {
    type: String,
    default: "Not specified",
  },
  location: {
    type: String,
    default: "Not specified",
  },
  company: {
    type: String,
    default: "Not specified",
  },
  education: {
    type: String,
    default: "Not specified",
  },
  experience: {
    type: Number,
    default: 0,
  },
  profileImage: {
    type: String,
    default: null,
  },
  interviewCount: {
    type: Number,
    default: 0,
  },
  lastSessionId: {
    type: String,
    default: null
  },
  picture: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: null,
  },
  age: {
    type: Number,
    default: null,
  },
  college: {
    type: String,
    default: null,
  },
  degree: {
    type: String,
    default: null,
  },
  branch: {
    type: String,
    default: null,
  },
  cgpa: {
    type: String,
    default: null,
  },
  graduationYear: {
    type: String,
    default: null,
  },
  resume: {
    url: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: 0 },
    fileType: { type: String, default: "application/pdf" },
    uploadedAt: { type: Date, default: null },
    atsScore: { type: Number, default: null },
    analysis: { type: mongoose.Schema.Types.Mixed, default: null },
    summary: { type: String, default: null },
  },
}, { timestamps: true });

export default mongoose.model("userModel", userSchema);
