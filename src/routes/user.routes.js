// src/routes/user.routes.js
import express from "express";
import { verifyFirebaseToken } from "../middleware/requireAuth.js";
import userModel from "../models/userModel.js";
import Subscription from "../models/Subscription.js";
import { sendEmail, buildCloudvynEmail } from "../utils/sendEmail.js";

const userRouter = express.Router();

const handleUserSync = async (req, res) => {
  try {
    const tokenUser = req.user || {};
    const bodyUser = req.body || {};

    const uid = tokenUser.uid;
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized: Missing Firebase UID" });
    }

    const email = bodyUser.email || tokenUser.email || "";
    const emailPrefix = email ? email.split("@")[0] : "User";
    
    // Resolve real name and username
    const resolvedName = (bodyUser.name || tokenUser.name || bodyUser.username || emailPrefix).trim();
    let resolvedUsername = (bodyUser.username || tokenUser.name || bodyUser.name || emailPrefix).trim();
    if (resolvedUsername.toLowerCase() === "firebaseuser") {
      resolvedUsername = (tokenUser.name || emailPrefix).trim();
    }
    
    const role = bodyUser.role || tokenUser.role || "candidate";
    const profileImage = bodyUser.profileImage || tokenUser.picture || null;
    const phone = bodyUser.phone || tokenUser.phone_number || null;
    const age = bodyUser.age ? Number(bodyUser.age) : null;
    const experience = bodyUser.experience ? Number(bodyUser.experience) || 0 : 0;
    const skills = bodyUser.skills
      ? Array.isArray(bodyUser.skills)
        ? bodyUser.skills
        : bodyUser.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    let user = await userModel.findOne({ firebaseUid: uid });

    if (!user) {
      user = await userModel.create({
        firebaseUid: uid,
        email,
        username: resolvedUsername,
        name: resolvedName,
        role,
        profileImage,
        picture: profileImage,
        phone,
        age,
        skills,
        experience,
        lastLoginAt: new Date(),
      });

      // Create a free-tier subscription for every new user
      const now = new Date();
      const cycleEnd = new Date(now);
      cycleEnd.setDate(cycleEnd.getDate() + 30);

      try {
        await Subscription.findOneAndUpdate(
          { userId: user._id },
          {
            $setOnInsert: {
              userId: user._id,
              planKey: "free",
              paidUntil: null,
              cycleStart: now,
              cycleEnd: cycleEnd,
              interviewsUsedThisCycle: 0,
            },
          },
          { upsert: true, new: true }
        );
        console.log(`[Subscription] Created free subscription for new user ${user._id}`);
      } catch (subErr) {
        console.error("[Subscription] Error provisioning subscription:", subErr.message);
      }

      // 1. Send Welcome Email to Candidate
      try {
        const candidateSubject = "Welcome to Cloudvyn! Your journey to interview success starts now.";
        const candidateHtmlBody = buildCloudvynEmail({
          preheader: "Your Cloudvyn account is ready — start your first AI mock interview.",
          greeting: `Welcome, ${resolvedName || resolvedUsername || "Candidate"}`,
          heading: "You're in. Let's get you interview-ready.",
          message: `
            <p style="margin:16px 0 0 0; font-family:'Inter',Helvetica,Arial,sans-serif; font-size:16px; line-height:24px; color:#5C5C5C; text-align:center;">
              Your account is set up and your <strong>Free Plan (₹0)</strong> is now active. You have unlocked <strong>5 AI Mock Interviews</strong> this month. Start practicing with an AI-led mock interview whenever you're ready — no scheduling, no waiting.
            </p>
          `,
          ctaText: "Start Your First Mock Interview",
          ctaLink: `${process.env.FRONTEND_URL || "https://www.cloudvyn.com"}/interview`
        });

        sendEmail({ to: email, subject: candidateSubject, html: candidateHtmlBody }).catch((err) =>
          console.error("Failed to send welcome email", err?.message)
        );
      } catch (emailErr) {
        console.error("Error building welcome email", emailErr?.message);
      }

      // 2. Send Notification Email to Admin
      try {
        const adminEmail = process.env.EMAIL_USER || "abhishekmadoliya@gmail.com";
        const adminSubject = `New User Signup: ${resolvedName || resolvedUsername || email}`;
        const adminHtmlBody = buildCloudvynEmail({
          preheader: "New candidate registration",
          greeting: "Admin Notification",
          heading: "New User Registration",
          message: `
            <p style="margin-bottom:16px;">A new candidate has just signed up on Cloudvyn.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 0 auto; text-align: left;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${resolvedName || resolvedUsername || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ID</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${user._id}</td>
              </tr>
            </table>
          `,
          ctaText: "View Dashboard",
          ctaLink: "https://cloudvyn.com/admin"
        });

        sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtmlBody }).catch((err) =>
          console.error("Failed to send admin email", err?.message)
        );
      } catch (emailErr) {
        console.error("Error building admin email", emailErr?.message);
      }
    } else {
      // Existing user: Update lastLogin and fix any legacy "firebaseUser" username or missing profile data
      user.lastLoginAt = new Date();
      if (!user.username || user.username.toLowerCase() === "firebaseuser") {
        user.username = resolvedUsername;
      }
      if (!user.name && resolvedName) {
        user.name = resolvedName;
      }
      if (bodyUser.role && (!user.role || user.role === "user")) {
        user.role = bodyUser.role;
      }
      if (bodyUser.phone && !user.phone) {
        user.phone = bodyUser.phone;
      }
      if (profileImage) {
        user.profileImage = profileImage;
        user.picture = profileImage;
      }
      await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error("Error in user /me route:", err);
    res.status(500).json({ message: "Server error during user sync", error: err.message });
  }
};

userRouter.get("/me", verifyFirebaseToken, handleUserSync);
userRouter.post("/me", verifyFirebaseToken, handleUserSync);
userRouter.post("/sync", verifyFirebaseToken, handleUserSync);

export default userRouter;
