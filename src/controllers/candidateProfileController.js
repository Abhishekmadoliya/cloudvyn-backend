import User from "../models/userModel.js";
import TestResult from "../models/testResultModel.js";
import TestAttempt from "../models/testAttemptModel.js";
import MockTest from "../models/mockTestModel.js";
import Interview from "../models/interviewModel.js";
import { uploadResumeToCloudinary } from "../config/cloudinary.js";
import { PDFParse } from "pdf-parse";
import { anaylzeResumeWithOllama } from "../utils/llm/ollama.js";
import ApiKey from "../models/apiKeyModel.js";
import Subscription from "../models/Subscription.js";

// Helper to extract AI interview score safely
function getAiInterviewScore(interview) {
  if (!interview) return 0;
  const s = interview.feedback?.score ?? interview.score ?? 0;
  const num = typeof s === 'number' ? s : parseFloat(s);
  return isNaN(num) ? 0 : num;
}

// Get candidate profile
export const getCandidateProfile = async (req, res) => {
  try {
    const firebaseUid = req.user.uid; // Firebase UID from token

    // Find user by firebaseUid
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    const fieldsToCheck = [
      { key: 'username', label: 'name' },
      { key: 'email', label: 'email' },
      { key: 'designation', label: 'title' },
      { key: 'location', label: 'location' },
      { key: 'education', label: 'education' },
      { key: 'skills', label: 'skills' },
      { key: 'profileImage', label: 'profile image' }
    ];

    let filledCount = 0;
    const missingFields = [];

    fieldsToCheck.forEach(field => {
      const val = user[field.key];
      if (Array.isArray(val) ? val.length > 0 : !!val) {
        filledCount += 1;
      } else {
        missingFields.push(field.label);
      }
    });

    const completionPercentage = Math.round((filledCount / fieldsToCheck.length) * 100);

    // Return profile data
    const profileData = {
      _id: user._id,
      firebaseUid: user.firebaseUid,
      name: user.username,
      email: user.email,
      title: user.designation || "Not specified",
      location: user.location || "Not specified",
      bio: user.bio ||  "No bio added yet...",
      company: user.company || "Not specified",
      education: user.education || "Not specified",
      experience: user.experience || 0,
      skills: user.skills || [],
      socials: user.socials || [],
      profileImage: user.profileImage || null,
      resume: user.resume || null,
      phone: user.phone || "",
      college: user.college || "",
      degree: user.degree || "",
      branch: user.branch || "",
      cgpa: user.cgpa || "",
      graduationYear: user.graduationYear || "",
      completionPercentage,
      missingFields,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: profileData,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

// Update candidate profile
export const updateCandidateProfile = async (req, res) => {
  try {
    const firebaseUid = req.user.uid; // Firebase UID from token
    const {
      name,
      title,
      location,
      phone,
      bio,
      company,
      education,
      college,
      degree,
      branch,
      cgpa,
      graduationYear,
      experience,
      skills,
      socials,
    } = req.body;

    // Find user by firebaseUid
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update profile fields
    if (name !== undefined) user.username = name;
    if (title !== undefined) user.designation = title;
    if (location !== undefined) user.location = location;
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (company !== undefined) user.company = company;
    if (college !== undefined) user.college = college;
    if (degree !== undefined) user.degree = degree;
    if (branch !== undefined) user.branch = branch;
    if (cgpa !== undefined) user.cgpa = cgpa;
    if (graduationYear !== undefined) user.graduationYear = graduationYear;
    
    if (education !== undefined) {
      user.education = education;
    } else if (degree || college) {
      user.education = [degree, branch, college].filter(Boolean).join(", ") || user.education;
    }

    if (experience !== undefined) user.experience = experience;
    if (skills && Array.isArray(skills)) user.skills = skills;
    if (socials && Array.isArray(socials)) user.socials = socials;

    // Save updated user
    await user.save();
    console.log("Profile updated successfully", user);

    const updatedProfile = {
      _id: user._id,
      firebaseUid: user.firebaseUid,
      name: user.username,
      email: user.email,
      title: user.designation || "Not specified",
      location: user.location || "Not specified",
      phone: user.phone || "",
      bio: user.bio || "No bio added yet",
      company: user.company || "Not specified",
      education: user.education || "Not specified",
      college: user.college || "",
      degree: user.degree || "",
      branch: user.branch || "",
      cgpa: user.cgpa || "",
      graduationYear: user.graduationYear || "",
      experience: user.experience || 0,
      skills: user.skills || [],
      socials: user.socials || [],
      profileImage: user.profileImage || null,
      resume: user.resume || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

// Get candidate performance statistics
export const getCandidateStats = async (req, res) => {
  try {
    const firebaseUid = req.user.uid; // Firebase UID from token

    // Find user by firebaseUid
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get all test results for the user
    const testResults = await TestResult.find({ userId: user._id }).populate(
      "testId"
    );

    // Get all AI interviews for the user
    // Interview userId stores Firebase UID
    const aiInterviews = await Interview.find({ userId: firebaseUid, status: "completed" });

    // Calculate statistics for TestResults
    const totalMockTests = testResults.length;
    const passedMockTests = testResults.filter((r) => r.isPassed).length;
    const totalMockScore = testResults.reduce((sum, r) => sum + r.percentage, 0);
    const totalMockTime = testResults.reduce((sum, r) => sum + r.totalTimeSpent, 0);

    // Calculate statistics for AI Interviews
    const totalAiInterviews = aiInterviews.length;
    const passedAiInterviews = aiInterviews.filter((i) => {
      const s = getAiInterviewScore(i);
      return s >= 7 || (s > 10 && s >= 70);
    }).length;
    const totalAiScore = aiInterviews.reduce((sum, i) => {
      const s = getAiInterviewScore(i);
      const pct = s <= 10 ? s * 10 : Math.min(s, 100);
      return sum + pct;
    }, 0);
    const totalAiTime = aiInterviews.reduce((sum, i) => sum + (i.duration || 0), 0);

    // Combine statistics
    const totalInterviews = totalMockTests + totalAiInterviews;
    const passedInterviews = passedMockTests + passedAiInterviews;
    const successRate =
      totalInterviews > 0 ? ((passedInterviews / totalInterviews) * 100).toFixed(2) : 0;

    // Calculate average score
    const averageScore =
      totalInterviews > 0
        ? ((totalMockScore + totalAiScore) / totalInterviews).toFixed(2)
        : 0;

    // Calculate total hours practiced
    const totalTimeSpent = totalMockTime + totalAiTime;
    const hoursPracticed = (totalTimeSpent / 3600).toFixed(2);

    // Category-wise performance
    const categoryPerformance = {};
    
    // Process test results for category stats
    testResults.forEach((result) => {
      if (result.categoryWiseScore && result.categoryWiseScore.length > 0) {
        result.categoryWiseScore.forEach((cat) => {
          if (!categoryPerformance[cat.category]) {
            categoryPerformance[cat.category] = {
              totalTests: 0,
              totalObtained: 0,
              totalMarks: 0,
            };
          }
          categoryPerformance[cat.category].totalTests += 1;
          categoryPerformance[cat.category].totalObtained += cat.obtained;
          categoryPerformance[cat.category].totalMarks += cat.total;
        });
      }
    });

    // Process AI interviews for category stats
    aiInterviews.forEach((interview) => {
      const category = interview.category || "General";
      if (!categoryPerformance[category]) {
        categoryPerformance[category] = {
          totalTests: 0,
          totalObtained: 0,
          totalMarks: 0,
        };
      }
      const s = getAiInterviewScore(interview);
      const scoreOutOf10 = s <= 10 ? s : (s / 10);
      categoryPerformance[category].totalTests += 1;
      categoryPerformance[category].totalObtained += scoreOutOf10;
      categoryPerformance[category].totalMarks += 10;
    });

    // Convert category performance to percentage
    const categoryStats = Object.keys(categoryPerformance).map((category) => ({
      category,
      percentage: (
        (categoryPerformance[category].totalObtained /
          categoryPerformance[category].totalMarks) *
        100
      ).toFixed(2),
      attempts: categoryPerformance[category].totalTests,
    }));

    // Recent activity (unified, last 5)
    const mappedTests = testResults.map((result) => ({
      id: result._id,
      testId: result.testId ? result.testId._id : null,
      title: (result.testId && result.testId.title) ? result.testId.title : "Mock Test",
      type: "mock_test",
      score: result.percentage,
      status: result.isPassed ? "Passed" : "Failed",
      date: result.submittedAt,
    }));

    const mappedInterviews = aiInterviews.map((interview) => {
      const rawScore = getAiInterviewScore(interview);
      const percentage = rawScore <= 10 ? rawScore * 10 : Math.min(rawScore, 100);
      const isPassed = rawScore >= 7 || percentage >= 70;

      return {
        id: interview._id,
        testId: interview.interviewId,
        title: `${interview.category || "AI"} Interview`,
        type: "ai_interview",
        score: percentage,
        status: isPassed ? "Passed" : "Needs Practice",
        date: interview.completedAt || interview.createdAt,
      };
    });

    const recentActivity = [...mappedTests, ...mappedInterviews]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    res.status(200).json({
      success: true,
      message: "Performance stats retrieved successfully",
      data: {
        totalInterviews,
        totalMockTests,
        totalAiInterviews,
        passedInterviews,
        successRate: parseFloat(successRate),
        averageScore: parseFloat(averageScore),
        hoursPracticed: parseFloat(hoursPracticed),
        categoryStats,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching performance statistics",
      error: error.message,
    });
  }
};

// Get detailed performance metrics
export const getCandidatePerformance = async (req, res) => {
  try {
    const firebaseUid = req.user.uid; // Firebase UID from token

    // Find user by firebaseUid
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get all test results with detailed information
    const testResults = await TestResult.find({ userId: user._id })
      .populate("testId", "title category difficulty")
      .populate("attemptId")
      .sort({ submittedAt: -1 });

    // Structure detailed performance data
    let detailedMetrics = testResults.map((result) => ({
      testId: result._id,
      testName: result.testId?.title || "Mock Test",
      category: result.testId?.category || "General",
      type: "mock_test",
      difficulty: result.testId?.difficulty || "Medium",
      marksObtained: result.marksObtained,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      status: result.isPassed ? "Passed" : "Failed",
      feedback: "MCQ Mock Test Evaluation",
      totalQuestions: result.totalQuestions,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      unattemptedCount: result.unattemptedCount,
      accuracy: (
        (result.correctCount / result.totalQuestions) *
        100
      ).toFixed(2),
      timeSpent: result.totalTimeSpent,
      avgTimePerQuestion: result.averageTimePerQuestion || 0,
      submittedAt: result.submittedAt,
      categoryWiseScore: result.categoryWiseScore || [],
      difficultyWiseScore: result.difficultyWiseScore || [],
    }));

    const aiInterviews = await Interview.find({ userId: firebaseUid, status: "completed" });
    const interviewMetrics = aiInterviews.map((interview) => {
      const rawScore = getAiInterviewScore(interview);
      const marksObtained = rawScore <= 10 ? rawScore : Math.round(rawScore / 10);
      const percentage = rawScore <= 10 ? rawScore * 10 : Math.min(rawScore, 100);
      const isPassed = rawScore >= 7 || percentage >= 70;

      return {
        testId: interview._id,
        testName: `${interview.category || "AI"} Interview`,
        category: interview.category || "General",
        type: "ai_interview",
        difficulty: interview.difficultyLevel || "beginner",
        marksObtained: marksObtained,
        totalMarks: 10,
        percentage: percentage,
        status: isPassed ? "Passed" : "Needs Practice",
        feedback: interview.feedback?.feedback || "Completed AI Interview session.",
        areasForImprovement: interview.feedback?.areasForImprovement || [],
        totalQuestions: interview.transcript?.filter(t => t.role === "ai").length || 0,
        correctCount: 0,
        wrongCount: 0,
        unattemptedCount: 0,
        accuracy: percentage.toFixed(2),
        timeSpent: interview.duration || 0,
        avgTimePerQuestion: 0,
        submittedAt: interview.completedAt || interview.createdAt,
        categoryWiseScore: [],
        difficultyWiseScore: [],
      };
    });

    // Combine detailedMetrics and interviewMetrics and sort by submittedAt
    detailedMetrics = [...detailedMetrics, ...interviewMetrics].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Calculate overall metrics
    const overallMetrics = {
      totalAttempts: detailedMetrics.length,
      totalPassed: detailedMetrics.filter((m) => m.status === "Passed").length,
      totalFailed: detailedMetrics.filter((m) => m.status === "Failed").length,
      averagePercentage:
        detailedMetrics.length > 0
          ? (
              detailedMetrics.reduce((sum, m) => sum + m.percentage, 0) /
              detailedMetrics.length
            ).toFixed(2)
          : 0,
      highestScore:
        detailedMetrics.length > 0
          ? Math.max(...detailedMetrics.map((m) => m.percentage))
          : 0,
      lowestScore:
        detailedMetrics.length > 0
          ? Math.min(...detailedMetrics.map((m) => m.percentage))
          : 0,
      totalTimeSpent: detailedMetrics.reduce((sum, m) => sum + m.timeSpent, 0),
      averageAccuracy:
        detailedMetrics.length > 0
          ? (
              detailedMetrics.reduce((sum, m) => sum + parseFloat(m.accuracy), 0) /
              detailedMetrics.length
            ).toFixed(2)
          : 0,
    };

    res.status(200).json({
      success: true,
      message: "Detailed performance metrics retrieved successfully",
      data: {
        overallMetrics,
        testWiseMetrics: detailedMetrics,
      },
    });
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching performance metrics",
      error: error.message,
    });
  }
};

// Get detailed history for a specific session
export const getHistoryDetail = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const { type, id } = req.params;

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (type === "mock_test") {
      const testResult = await TestResult.findById(id)
        .populate("testId")
        .populate({
          path: "attemptId",
          populate: {
            path: "answers.questionId"
          }
        });

      if (!testResult) {
        return res.status(404).json({ success: false, message: "Test result not found" });
      }
      
      // Ensure it belongs to user
      if (testResult.userId.toString() !== user._id.toString()) {
         return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      return res.status(200).json({
        success: true,
        data: testResult,
      });

    } else if (type === "ai_interview") {
      const interview = await Interview.findById(id);

      if (!interview) {
        return res.status(404).json({ success: false, message: "Interview not found" });
      }

      // Ensure it belongs to user
      if (interview.userId !== firebaseUid) {
         return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      return res.status(200).json({
        success: true,
        data: interview,
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid history type" });
    }
  } catch (error) {
    console.error("Error fetching history detail:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching history detail",
      error: error.message,
    });
  }
};

// Get candidate achievements
export const getAchievements = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const testResults = await TestResult.find({ userId: user._id }).populate("testId");
    const aiInterviews = await Interview.find({ userId: firebaseUid, status: "completed" });

    const allSessions = [
      ...testResults.map(t => ({
        date: new Date(t.submittedAt),
        score: t.percentage,
        isPassed: t.isPassed,
        category: t.testId?.category || "General",
        timeSpent: t.totalTimeSpent || 0,
        type: "mock_test"
      })),
      ...aiInterviews.map(i => {
        const rawScore = getAiInterviewScore(i);
        const percentage = rawScore <= 10 ? rawScore * 10 : Math.min(rawScore, 100);
        return {
          date: new Date(i.completedAt || i.createdAt),
          score: percentage,
          isPassed: rawScore >= 7 || percentage >= 70,
          category: i.category || "General",
          timeSpent: i.duration || 0,
          type: "ai_interview"
        };
      })
    ].sort((a, b) => a.date - b.date);

    // Profile Completion Logic
    const fieldsToCheck = ['username', 'email', 'designation', 'location', 'education', 'skills', 'profileImage'];
    let filledCount = 0;
    fieldsToCheck.forEach(key => {
      const val = user[key];
      if (Array.isArray(val) ? val.length > 0 : !!val) filledCount++;
    });
    const profileCompletion = Math.round((filledCount / fieldsToCheck.length) * 100);

    // 1. First Impression
    const firstAi = allSessions.find(s => s.type === "ai_interview");
    
    // 2. High Performer
    const highPerformer = allSessions.find(s => s.score >= 90);

    // 3. Consistent Learner (3-day streak)
    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate = null;
    let streakEarnedDate = null;
    
    const uniqueDates = [...new Set(allSessions.map(s => s.date.toDateString()))]
      .map(d => new Date(d))
      .sort((a, b) => a - b);

    for (let i = 0; i < uniqueDates.length; i++) {
      if (!lastDate) {
        currentStreak = 1;
      } else {
        const diffTime = Math.abs(uniqueDates[i] - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
      
      if (currentStreak >= 3 && !streakEarnedDate) {
        streakEarnedDate = uniqueDates[i];
      }
      lastDate = uniqueDates[i];
    }

    // 4. Domain Specialist
    const categoryCounts = {};
    let domainEarnedDate = null;
    for (const session of allSessions) {
      if (session.isPassed) {
        categoryCounts[session.category] = (categoryCounts[session.category] || 0) + 1;
        if (categoryCounts[session.category] >= 3 && !domainEarnedDate) {
          domainEarnedDate = session.date;
        }
      }
    }

    // 5. Marathon Prep (5 hours = 18000 seconds)
    let cumulativeTime = 0;
    let marathonEarnedDate = null;
    for (const session of allSessions) {
      cumulativeTime += session.timeSpent;
      if (cumulativeTime >= 18000 && !marathonEarnedDate) {
        marathonEarnedDate = session.date;
      }
    }

    // 6. Profile Champion
    const isProfileChampion = profileCompletion === 100;

    const badges = [
      {
        id: "b-1",
        name: "First Impression",
        category: "Interviews",
        description: "Completed your first AI mock interview session.",
        earned: !!firstAi,
        earnedDate: firstAi ? firstAi.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null
      },
      {
        id: "b-2",
        name: "High Performer",
        category: "Interviews",
        description: "Scored 90%+ in a Technical mock test or AI interview.",
        earned: !!highPerformer,
        earnedDate: highPerformer ? highPerformer.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null
      },
      {
        id: "b-3",
        name: "Consistent Learner",
        category: "Consistency",
        description: "Maintained a 3-day active practice streak.",
        earned: !!streakEarnedDate,
        earnedDate: streakEarnedDate ? streakEarnedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null
      },
      {
        id: "b-4",
        name: "Domain Specialist",
        category: "Skills",
        description: "Passed 3 sessions in the same category.",
        earned: !!domainEarnedDate,
        earnedDate: domainEarnedDate ? domainEarnedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null
      },
      {
        id: "b-5",
        name: "Marathon Prep",
        category: "Consistency",
        description: "Logged over 5 hours of total interview practice time.",
        earned: !!marathonEarnedDate,
        earnedDate: marathonEarnedDate ? marathonEarnedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null
      },
      {
        id: "b-6",
        name: "Profile Champion",
        category: "Consistency",
        description: "Completed 100% of your user profile details.",
        earned: isProfileChampion,
        earnedDate: isProfileChampion ? user.updatedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null
      }
    ];

    const stats = {
      currentStreak: maxStreak,
      badgesUnlocked: badges.filter(b => b.earned).length,
      totalBadges: badges.length,
      platformRank: "Top 15%" // Mocking rank for now
    };

    res.status(200).json({
      success: true,
      data: { badges, stats }
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ success: false, message: "Error fetching achievements" });
  }
};

// Get candidate resume
export const getCandidateResume = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      resume: user.resume || null,
    });
  } catch (error) {
    console.error("Error fetching candidate resume:", error);
    res.status(500).json({ success: false, message: "Failed to fetch resume" });
  }
};

// Upload candidate resume to Cloudinary + AI analysis
export const uploadCandidateResume = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No resume file uploaded" });
    }

    // 1. Upload to Cloudinary
    const uploadResult = await uploadResumeToCloudinary(
      req.file.buffer,
      req.file.originalname,
      "resumes"
    );

    // 2. Extract text if PDF
    let resumeText = "";
    try {
      if (req.file.mimetype === "application/pdf" || req.file.originalname.toLowerCase().endsWith(".pdf")) {
        const parser = new PDFParse({ data: req.file.buffer });
        const parsed = await parser.getText();
        resumeText = parsed.text || "";
      }
    } catch (parseErr) {
      console.warn("PDF extraction warning:", parseErr.message);
    }

    // 3. AI Analysis & ATS scoring
    let analysis = null;
    let atsScore = 80;
    if (resumeText && resumeText.trim().length > 50) {
      try {
        const ollamaResult = await anaylzeResumeWithOllama(resumeText);
        let text = ollamaResult.text || "";
        text = text.replace(/```json\n?|\n?```/g, "").trim();
        analysis = JSON.parse(text);
        if (analysis?.atsScore || analysis?.score) {
          atsScore = Number(analysis.atsScore || analysis.score);
        }
      } catch (aiErr) {
        console.warn("AI resume analysis fallback:", aiErr.message);
        analysis = {
          summary: "Resume uploaded successfully.",
          skills: [],
          experience: user.experience ? `${user.experience} years` : "Not specified",
        };
      }
    }

    // 4. Save to User Document
    user.resume = {
      url: uploadResult.url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype || "application/pdf",
      uploadedAt: new Date(),
      atsScore: atsScore,
      analysis: analysis,
      summary: analysis?.summary || "Resume uploaded and stored securely.",
    };

    // If analysis identified new skills, merge with user skills
    if (analysis?.skills && Array.isArray(analysis.skills) && analysis.skills.length > 0) {
      const existingSkills = new Set(user.skills || []);
      analysis.skills.forEach(s => {
        if (typeof s === "string" && s.trim()) existingSkills.add(s.trim());
      });
      user.skills = Array.from(existingSkills);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Resume uploaded and analyzed successfully",
      resume: user.resume,
    });
  } catch (error) {
    console.error("Error uploading candidate resume:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to upload resume" });
  }
};

// Delete candidate resume
export const deleteCandidateResume = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.resume = {
      url: null,
      fileName: null,
      fileSize: 0,
      fileType: "application/pdf",
      uploadedAt: null,
      atsScore: null,
      analysis: null,
      summary: null,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: "Resume removed successfully",
    });
  } catch (error) {
    console.error("Error deleting resume:", error);
    res.status(500).json({ success: false, message: "Failed to delete resume" });
  }
};

// ─── Bring Your Own Key (BYOK) for Plus & Pro Users ─────────────────────────

// Get Saved BYOK Key status
export const getSavedByokKey = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const user = await User.findOne({ firebaseUid });
    const sub = user ? await Subscription.findOne({ userId: user._id }) : null;
    const planKey = sub?.planKey?.toLowerCase();
    const isPaid = (planKey === "plus" || planKey === "pro") && sub?.paidUntil && new Date(sub.paidUntil) > new Date();

    const apiKeyDoc = await ApiKey.findOne({ userId: firebaseUid });

    res.status(200).json({
      success: true,
      isPaid: !!isPaid,
      planKey: planKey || "free",
      hasKey: !!apiKeyDoc,
      maskedKey: apiKeyDoc?.maskedKey || null,
      provider: apiKeyDoc?.provider || "gemini",
      isActive: apiKeyDoc ? apiKeyDoc.isActive : false,
      lastUsedAt: apiKeyDoc?.lastUsedAt || null,
    });
  } catch (error) {
    console.error("Error fetching BYOK key:", error);
    res.status(500).json({ success: false, message: "Failed to fetch API key" });
  }
};

// Save or Update BYOK Key
export const saveByokKey = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const { apiKey, provider = "gemini" } = req.body;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 8) {
      return res.status(400).json({ success: false, message: "Please provide a valid Gemini API key" });
    }

    // Verify user is Plus or Pro with active paid access
    const user = await User.findOne({ firebaseUid });
    const sub = user ? await Subscription.findOne({ userId: user._id }) : null;
    const planKey = sub?.planKey?.toLowerCase();
    const isPaid = (planKey === "plus" || planKey === "pro") && sub?.paidUntil && new Date(sub.paidUntil) > new Date();

    if (!isPaid) {
      return res.status(403).json({
        success: false,
        message: "Bring Your Own Key (BYOK) is exclusive to Cloudvyn Plus and Pro subscribers.",
      });
    }

    const trimmedKey = apiKey.trim();
    const maskedKey = `${trimmedKey.slice(0, 6)}••••••••${trimmedKey.slice(-4)}`;

    const savedDoc = await ApiKey.findOneAndUpdate(
      { userId: firebaseUid },
      {
        apiKey: trimmedKey,
        maskedKey,
        provider: provider.toLowerCase(),
        isActive: true,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Gemini API key saved securely in your profile.",
      maskedKey: savedDoc.maskedKey,
      provider: savedDoc.provider,
      isActive: savedDoc.isActive,
    });
  } catch (error) {
    console.error("Error saving BYOK key:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to save API key" });
  }
};

// Delete BYOK Key
export const deleteByokKey = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    await ApiKey.findOneAndDelete({ userId: firebaseUid });

    res.status(200).json({
      success: true,
      message: "Gemini API key removed successfully",
    });
  } catch (error) {
    console.error("Error removing BYOK key:", error);
    res.status(500).json({ success: false, message: "Failed to remove API key" });
  }
};
