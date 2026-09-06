import userModel from "../models/userModel.js";
import Interview from "../models/interviewModel.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import admin from "../firebase/firebaseAdmin.js";

/**
 * Verifies Firebase ID Token
 */
export async function verifyToken(token) {
  if (!token) throw new Error("No token provided");
  return await admin.auth().verifyIdToken(token);
}

/**
 * Looks up user and updates session tracking.
 * Rate-limiting is now handled by the subscription entitlement system,
 * not the hard-coded interviewCount on the user doc.
 */
export async function handleUserSession(firebaseUid, sessionId) {
  let user = await userModel.findOne({ firebaseUid });

  if (user) {
    const isNewSession = !sessionId || user.lastSessionId !== sessionId;
    if (isNewSession) {
      user.lastSessionId = sessionId;
      await user.save();
    }
  }
  return user;
}

/**
 * Check entitlement for WebSocket interview sessions.
 * Returns { allowed, subscription, plan, reason? }
 */
export async function checkWsEntitlement(user, byokKey) {
  if (!user?._id) {
    return { allowed: false, reason: "UNAUTHORIZED" };
  }

  let sub = await Subscription.findOne({ userId: user._id });
  if (!sub) {
    const now = new Date();
    const cycleEnd = new Date(now);
    cycleEnd.setDate(cycleEnd.getDate() + 30);

    sub = await Subscription.create({
      userId: user._id,
      planKey: "free",
      paidUntil: null,
      cycleStart: now,
      cycleEnd,
      interviewsUsedThisCycle: 0,
    });
  }

  // Auto-downgrade expired paid plans
  if (sub.planKey !== "free" && sub.paidUntil && sub.paidUntil < new Date()) {
    const now = new Date();
    sub.planKey = "free";
    sub.paidUntil = null;
    sub.interviewsUsedThisCycle = 0;
    sub.cycleStart = now;
    sub.cycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await sub.save();
  }

  const plan = await Plan.findOne({ key: sub.planKey });
  if (!plan) {
    return { allowed: false, reason: "PLAN_NOT_FOUND" };
  }

  // BYOK bypass: Plus tier users with active paid status can supply their own API key
  const isPaid = sub.planKey !== "free" && sub.paidUntil && sub.paidUntil > new Date();
  if (byokKey && plan.allowBYOK && isPaid) {
    return { allowed: true, subscription: sub, plan, byok: true };
  }

  // Cap check
  if (sub.interviewsUsedThisCycle >= plan.interviewCap) {
    return {
      allowed: false,
      reason: "CAP_REACHED",
      cap: plan.interviewCap,
      used: sub.interviewsUsedThisCycle,
      resetsAt: sub.cycleEnd,
      planKey: sub.planKey,
    };
  }

  return { allowed: true, subscription: sub, plan, byok: false };
}

/**
 * Atomically increment interview usage counter on the user's subscription.
 * Idempotent: when interviewId is provided, atomically marks quotaDeducted on the
 * Interview document so an interview is NEVER counted more than once.
 */
export async function incrementInterviewUsage(userId, interviewId = null) {
  if (!userId) return null;

  // Idempotency check: if interviewId is provided, atomically mark quotaDeducted
  if (interviewId) {
    const interview = await Interview.findOneAndUpdate(
      { interviewId, quotaDeducted: { $ne: true } },
      { $set: { quotaDeducted: true } },
      { new: true }
    );

    // If no document matched, quota has ALREADY been deducted for this interview session
    if (!interview) {
      console.warn(`[Entitlement] Quota already deducted for interview ${interviewId} — skipping duplicate increment.`);
      return null;
    }
  }

  const result = await Subscription.updateOne(
    { userId },
    { $inc: { interviewsUsedThisCycle: 1 } }
  );
  if (result.modifiedCount > 0) {
    console.log(`[Entitlement] Incremented interview usage for user ${userId} (interview: ${interviewId || 'N/A'})`);
  }
  return result;
}

/**
 * Retrieves or creates an interview record
 */
export async function getOrCreateInterview(context, user) {
  const { interviewId, interviewType, category } = context;

  if (!interviewId) return null;

  const existingInterview = await Interview.findOne({ interviewId });

  if (existingInterview) {
    if (existingInterview.status === "completed") {
      throw new Error("INTERVIEW_ALREADY_COMPLETED");
    }

    // Mark as started if it was pre-created as practice
    if (existingInterview.status === "practice") {
      existingInterview.status = "started";
      await existingInterview.save();
    }

    // Resume logic: transform transcript to history format
    let history = [];
    if (existingInterview.transcript && existingInterview.transcript.length > 0) {
      history = existingInterview.transcript.map(item => ({
        role: item.role === 'ai' ? 'assistant' : (item.role === 'user' ? 'user' : 'system'),
        content: item.content || item.text // Handle both schemas
      }));
    }

    return { interview: existingInterview, history, resumed: history.length > 0 };
  }

  // Create new interview
  const newInterview = await Interview.create({
    userId: user ? user.firebaseUid : (context.userId || "guest"),
    interviewId,
    interviewType: interviewType || "technical",
    category: typeof category === 'string' ? category : (category?.name || "unknown"),
    difficultyLevel: "medium",
    status: "started",
    transcript: []
  });

  return { interview: newInterview, history: [], resumed: false };
}

/**
 * Finalizes an interview (saves feedback, score, transcript)
 */
export async function finalizeInterview(interviewId, data) {
  const { status, feedback, history, duration } = data;

  return await Interview.findOneAndUpdate(
    { interviewId },
    {
      status: status || "completed",
      feedback: feedback,
      score: feedback?.score,
      completedAt: new Date(),
      transcript: history.map(h => ({
        role: h.role === 'assistant' ? 'ai' : h.role,
        content: h.content,
        timestamp: new Date()
      })),
      duration: duration || 0
    },
    { new: true }
  );
}

