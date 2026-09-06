import express from "express";
import { requireAdminAuth } from "../../middleware/requireAuth.js";
import Subscription from "../../models/Subscription.js";
import userModel from "../../models/userModel.js";
import Plan from "../../models/Plan.js";

const paymentAdminRouter = express.Router();

// Guard all routes with Admin authentication
paymentAdminRouter.use(requireAdminAuth);

/**
 * GET /api/admin/payments/all
 * List all subscriptions populated with user info
 */
paymentAdminRouter.get("/all", async (req, res) => {
  try {
    const subscriptions = await Subscription.find({})
      .populate("userId", "username email role profileImage")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Fetched all payment subscriptions",
      data: subscriptions,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/payments/all:", error);
    return res.status(500).json({ success: false, message: "Server error fetching payments" });
  }
});

/**
 * GET /api/admin/payments/stats
 * Overview revenue and subscription statistics
 */
paymentAdminRouter.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const totalSubs = await Subscription.countDocuments({});
    const activePaidSubs = await Subscription.countDocuments({ planKey: { $ne: "free" }, paidUntil: { $gt: now } });
    const plusSubs = await Subscription.countDocuments({ planKey: "plus", paidUntil: { $gt: now } });
    const proSubs = await Subscription.countDocuments({ planKey: "pro", paidUntil: { $gt: now } });
    const freeSubs = await Subscription.countDocuments({ $or: [{ planKey: "free" }, { paidUntil: { $lte: now } }, { paidUntil: null }] });
    const expiredSubs = await Subscription.countDocuments({ planKey: { $ne: "free" }, paidUntil: { $lte: now } });

    // Fetch actual plan prices from DB or use ₹150 for Pro and ₹50 for Plus
    const plusPlan = await Plan.findOne({ key: "plus" });
    const proPlan = await Plan.findOne({ key: "pro" });

    const plusPrice = plusPlan?.priceInPaise ? Math.round(plusPlan.priceInPaise / 100) : 50;
    const proPrice = proPlan?.priceInPaise ? Math.round(proPlan.priceInPaise / 100) : 150;

    const estimatedRevenue = (plusSubs * plusPrice) + (proSubs * proPrice);

    return res.status(200).json({
      success: true,
      data: {
        totalSubs,
        activeSubs: activePaidSubs,
        freeSubs,
        plusSubs,
        proSubs,
        expiredSubs,
        estimatedMRR: estimatedRevenue,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/payments/stats:", error);
    return res.status(500).json({ success: false, message: "Server error fetching payment stats" });
  }
});

/**
 * PUT /api/admin/payments/user-plan/:userId
 * Admin override user subscription plan & duration
 */
paymentAdminRouter.put("/user-plan/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { planKey, days = 30 } = req.body;

    let sub = await Subscription.findOne({ userId });
    const now = new Date();
    const paidUntil = planKey && planKey !== "free" ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : null;

    if (!sub) {
      // Find user first
      const user = await userModel.findOne({ $or: [{ firebaseUid: userId }, { _id: userId }] });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      sub = new Subscription({
        userId: user._id,
        planKey: planKey || "free",
        paidUntil,
        cycleStart: now,
        cycleEnd: paidUntil || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        interviewsUsedThisCycle: 0,
      });
    } else {
      if (planKey) {
        sub.planKey = planKey;
        sub.paidUntil = paidUntil;
        if (paidUntil) {
          sub.cycleEnd = paidUntil;
          sub.interviewsUsedThisCycle = 0;
        }
      }
    }

    await sub.save();
    const updatedSub = await Subscription.findById(sub._id).populate("userId", "username email role");

    return res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: updatedSub,
    });
  } catch (error) {
    console.error("Error in PUT /api/admin/payments/user-plan:", error);
    return res.status(500).json({ success: false, message: "Server error updating subscription" });
  }
});

export default paymentAdminRouter;
