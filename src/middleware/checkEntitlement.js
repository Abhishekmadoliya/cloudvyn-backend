/**
 * checkEntitlement.js
 *
 * Express middleware that gates interview-start routes.
 * Must run AFTER requireAuth (needs req.dbUser._id).
 *
 * Checks:
 *  1. Subscription exists (auto-create free if not)
 *  2. If paid plan expired, auto-downgrades to free
 *  3. BYOK bypass (Plus / Pro tier users with active paid status)
 *  4. Interview cap not exceeded
 */

import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";

export async function checkEntitlement(req, res, next) {
  try {
    const userId = req.dbUser?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "unauthorized" });
    }

    let sub = await Subscription.findOne({ userId });

    if (!sub) {
      const now = new Date();
      const cycleEnd = new Date(now);
      cycleEnd.setDate(cycleEnd.getDate() + 30);

      sub = await Subscription.create({
        userId,
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
      console.log(`[Entitlement] Expired paid plan auto-downgraded to free for user ${userId}`);
    }

    const plan = await Plan.findOne({ key: sub.planKey });
    if (!plan) {
      return res.status(500).json({
        success: false,
        error: "plan_not_found",
        message: "Plan configuration error. Please contact support.",
      });
    }

    // BYOK bypass: Plus/Pro tier users with active paid status can supply their own API key
    const isPaid = sub.planKey !== "free" && sub.paidUntil && sub.paidUntil > new Date();
    const byokKey = req.body?.byokKey;

    if (byokKey && plan.allowBYOK && isPaid) {
      req.byokKey = byokKey; // Pass downstream to the interview session handler
      req.subscription = sub;
      req.plan = plan;
      return next(); // BYOK sessions skip the cap entirely
    }

    // Cap check
    if (sub.interviewsUsedThisCycle >= plan.interviewCap) {
      return res.status(403).json({
        success: false,
        error: "cap_reached",
        message: `You've used all ${plan.interviewCap} interviews for this cycle.`,
        cap: plan.interviewCap,
        used: sub.interviewsUsedThisCycle,
        resetsAt: sub.cycleEnd,
        planKey: sub.planKey,
      });
    }

    // Attach for downstream use
    req.subscription = sub;
    req.plan = plan;
    next();
  } catch (err) {
    console.error("checkEntitlement error:", err.message);
    res.status(500).json({
      success: false,
      error: "entitlement_check_failed",
      message: "Server error checking entitlement.",
    });
  }
}
