/**
 * subscriptions.js — Subscription management routes (One-Time Payment model).
 *
 * GET  /api/subscriptions/me             — Current user's plan, usage, paid status
 * POST /api/subscriptions/create-order   — Create Razorpay order for plan purchase
 * POST /api/subscriptions/verify-payment — Verify payment & activate plan instantly
 */

import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import { createOrder, verifyPaymentSignature, fetchOrder } from "../services/razorpay.js";
import PaymentEvent from "../models/PaymentEvent.js";
import userModel from "../models/userModel.js";
import { sendEmail, buildCloudvynEmail } from "../utils/sendEmail.js";

const subscriptionRouter = express.Router();

/**
 * Helper: Check if a subscription has active paid access.
 */
function isPaidActive(sub) {
  return (
    sub &&
    sub.planKey !== "free" &&
    sub.paidUntil &&
    sub.paidUntil > new Date()
  );
}

/**
 * GET /api/subscriptions/me
 * Returns the current user's subscription details + plan info.
 * Powers the account/billing UI and usage indicator.
 * Auto-downgrades expired paid plans inline.
 */
subscriptionRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.dbUser._id;

    let sub = await Subscription.findOne({ userId });

    // Safety: if subscription doc doesn't exist, create a free one
    if (!sub) {
      const now = new Date();
      const cycleEnd = new Date(now);
      cycleEnd.setDate(cycleEnd.getDate() + 30);

      sub = await Subscription.create({
        userId,
        planKey: "free",
        paidUntil: null,
        cycleStart: now,
        cycleEnd: cycleEnd,
        interviewsUsedThisCycle: 0,
      });
    }

    // Auto-downgrade if paid plan has expired
    if (sub.planKey !== "free" && sub.paidUntil && sub.paidUntil <= new Date()) {
      const now = new Date();
      sub.planKey = "free";
      sub.paidUntil = null;
      sub.interviewsUsedThisCycle = 0;
      sub.cycleStart = now;
      sub.cycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await sub.save();
      console.log(`[Subscription] Auto-downgraded expired plan for user ${userId}`);
    }

    // Auto-reconcile with latest successful payment event if subscription is currently free
    if (sub.planKey === "free" || !sub.paidUntil || sub.paidUntil <= new Date()) {
      const latestPayment = await PaymentEvent.findOne({
        userId,
        eventType: { $in: ["payment.verified", "payment.captured"] },
      }).sort({ processedAt: -1 });

      if (latestPayment && latestPayment.payload) {
        const payload = latestPayment.payload;
        const planKey = payload.planKey;
        const processedAt = new Date(latestPayment.processedAt || Date.now());
        const validUntil = payload.paidUntil
          ? new Date(payload.paidUntil)
          : new Date(processedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (["plus", "pro"].includes(planKey) && validUntil > new Date()) {
          sub.planKey = planKey;
          sub.paidUntil = validUntil;
          sub.lastPaymentId = latestPayment.razorpayEventId || payload.paymentId || null;
          sub.lastOrderId = payload.orderId || null;
          sub.cycleEnd = validUntil;
          await sub.save();
          console.log(`[Subscription] Auto-reconciled and activated ${planKey} for user ${userId} until ${validUntil.toISOString()}`);
        }
      }
    }

    const plan = await Plan.findOne({ key: sub.planKey });
    const isActive = isPaidActive(sub) || sub.planKey === "free";

    res.json({
      success: true,
      subscription: {
        planKey: sub.planKey,
        planName: plan?.name || sub.planKey,
        isActive,
        paidUntil: sub.paidUntil,
        interviewsUsed: sub.interviewsUsedThisCycle,
        interviewCap: plan?.interviewCap || 5,
        cycleStart: sub.cycleStart,
        cycleEnd: sub.cycleEnd,
        lastPaymentId: sub.lastPaymentId,
      },
      plan: plan
        ? {
          key: plan.key,
          name: plan.name,
          priceInPaise: plan.priceInPaise,
          interviewCap: plan.interviewCap,
          allowBYOK: plan.allowBYOK,
          languages: plan.languages,
          features: plan.features,
        }
        : null,
    });
  } catch (err) {
    console.error("GET /subscriptions/me error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * POST /api/subscriptions/create-order
 * Body: { planKey: "plus" | "pro" }
 * Creates a Razorpay Order and returns order details for frontend checkout.
 */
subscriptionRouter.post(["/create-order", "/create"], requireAuth, async (req, res) => {
  try {
    const { planKey } = req.body;

    if (!planKey || !["plus", "pro"].includes(planKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan. Choose 'plus' or 'pro'.",
      });
    }

    const userId = req.dbUser._id;

    // If user already has ANY active paid subscription, block new orders until validity expires
    const existingSub = await Subscription.findOne({ userId });
    const isCurrentlyActive = existingSub && existingSub.planKey !== "free" && existingSub.paidUntil && new Date(existingSub.paidUntil) > new Date();

    if (isCurrentlyActive) {
      const formattedDate = new Date(existingSub.paidUntil).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return res.status(400).json({
        success: false,
        message: `You currently have an active ${existingSub.planKey.toUpperCase()} plan valid until ${formattedDate}. You cannot purchase or switch plans until your current plan expires.`,
      });
    }

    // Create Razorpay order
    const order = await createOrder(planKey, userId);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planKey,
      message: "Order created. Open Razorpay checkout to complete payment.",
    });
  } catch (err) {
    console.error("POST /subscriptions/create-order error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/subscriptions/verify-payment
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, planKey }
 *
 * Server-side verification of payment. On success, activates the plan immediately.
 * This is the PRIMARY activation path (webhook is a backup).
 */
subscriptionRouter.post("/verify-payment", requireAuth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planKey,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields.",
      });
    }

    if (!planKey || !["plus", "pro"].includes(planKey)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan key.",
      });
    }

    // 1. Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.warn(`[Payment] Invalid signature for order ${razorpay_order_id}`);
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }

    console.log(`[Payment] Signature verified for order ${razorpay_order_id}`);

    const userId = req.dbUser._id;

    // 2. Fetch authoritative order details from Razorpay to prevent tampering
    let verifiedPlanKey = planKey;
    try {
      const rzpOrder = await fetchOrder(razorpay_order_id);
      if (rzpOrder?.notes?.planKey) {
        verifiedPlanKey = rzpOrder.notes.planKey;
      }
    } catch (fetchErr) {
      console.warn(`[Payment] Could not fetch order ${razorpay_order_id} from Razorpay:`, fetchErr.message);
    }

    const plan = await Plan.findOne({ key: verifiedPlanKey, active: true });
    if (!plan) {
      return res.status(400).json({ success: false, message: "Plan not found." });
    }

    // 3. Check if already applied to this user's subscription (prevents double-stacking race condition)
    let sub = await Subscription.findOne({ userId });
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${razorpay_payment_id.slice(-4).toUpperCase()}`;

    if (sub && (sub.lastPaymentId === razorpay_payment_id || sub.lastOrderId === razorpay_order_id)) {
      console.log(`[Payment] Subscription already activated for payment ${razorpay_payment_id} — ensuring receipt is recorded`);

      try {
        await PaymentEvent.updateOne(
          { razorpayEventId: razorpay_payment_id },
          {
            $setOnInsert: {
              eventType: "payment.verified",
              processedAt: new Date(),
            },
            $set: {
              userId,
              "payload.orderId": razorpay_order_id,
              "payload.paymentId": razorpay_payment_id,
              "payload.planKey": verifiedPlanKey,
              "payload.planName": plan.name,
              "payload.amount": plan.priceInPaise / 100,
              "payload.currency": "INR",
              "payload.paidUntil": sub.paidUntil,
              "payload.invoiceNumber": invoiceNumber,
            },
          },
          { upsert: true }
        );
      } catch (e) {
        console.warn(`[Payment] Failed to upsert payment event:`, e.message);
      }

      return res.json({
        success: true,
        message: `${verifiedPlanKey.toUpperCase()} plan is active.`,
        invoiceNumber,
        subscription: sub,
      });
    }

    // 4. Calculate activation period (paidUntil: 30 days from payment)
    const now = new Date();
    let paidUntil = new Date(now);
    paidUntil.setDate(paidUntil.getDate() + 30);

    /*
    // Early renewal stacking commented out — candidates manually pay on month end
    if (sub && sub.paidUntil && sub.paidUntil > now) {
      const remainingMs = sub.paidUntil.getTime() - now.getTime();
      paidUntil = new Date(paidUntil.getTime() + remainingMs);
      console.log(`[Payment] Early renewal — stacking ${Math.ceil(remainingMs / (1000 * 60 * 60 * 24))} remaining days`);
    }
    */

    // 5. Record payment event (idempotency guard with receipt data)
    try {
      await PaymentEvent.create({
        razorpayEventId: razorpay_payment_id,
        eventType: "payment.verified",
        payload: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          planKey: verifiedPlanKey,
          planName: plan.name,
          amount: plan.priceInPaise / 100,
          currency: "INR",
          paidUntil,
          invoiceNumber,
        },
        processedAt: new Date(),
        userId,
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        console.log(`[Payment] Duplicate payment event ${razorpay_payment_id} — returning current state`);
        const existingSub = await Subscription.findOne({ userId });
        return res.json({
          success: true,
          message: "Payment already processed.",
          invoiceNumber,
          subscription: existingSub,
        });
      }
      throw dupErr;
    }

    // 6. Activate the plan
    sub = await Subscription.findOneAndUpdate(
      { userId },
      {
        planKey: verifiedPlanKey,
        paidUntil,
        lastPaymentId: razorpay_payment_id,
        lastOrderId: razorpay_order_id,
        interviewsUsedThisCycle: 0,
        cycleStart: now,
        cycleEnd: paidUntil,
      },
      { upsert: true, new: true }
    );

    console.log(`[Payment] ✅ Plan activated: ${verifiedPlanKey} for user ${userId}, paid until ${paidUntil.toISOString()}`);

    // 6. Send upgrade emails (non-blocking) with receipt details
    try {
      const user = await userModel.findById(userId);
      if (user && user.email) {
        // Candidate email with receipt
        const candidateHtml = buildCloudvynEmail({
          preheader: `Your Cloudvyn ${verifiedPlanKey.toUpperCase()} plan receipt & confirmation.`,
          greeting: `Hello ${user.name || user.username || "Candidate"}`,
          heading: "Payment Receipt & Plan Activated 🎉",
          message: `
            <p style="margin-top:0;">Thank you for your payment. Your <strong>${verifiedPlanKey.toUpperCase()} Plan</strong> is now active.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 16px 0; text-align: left; font-size: 14px;">
              <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Invoice Number</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${invoiceNumber}</td></tr>
              <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Payment ID</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${razorpay_payment_id}</td></tr>
              <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Plan</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${verifiedPlanKey.toUpperCase()} (30 Days)</td></tr>
              <tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Amount Paid</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #16a34a;">₹${plan.priceInPaise / 100} (Inclusive of taxes)</td></tr>
              <tr style="background: #f8fafc;"><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Valid Until</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${paidUntil.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
            </table>
            <p>You can view and download your full receipt anytime from your <a href="${process.env.FRONTEND_URL || "https://www.cloudvyn.com"}/profile/account" style="color: #ec4899; text-decoration: underline;">Account page</a>.</p>
          `,
          ctaText: "View Account & Receipts",
          ctaLink: `${process.env.FRONTEND_URL || "https://www.cloudvyn.com"}/profile/account`,
        });
        await sendEmail({
          to: user.email,
          subject: `Payment Receipt: Cloudvyn ${verifiedPlanKey.toUpperCase()} Plan (${invoiceNumber})`,
          html: candidateHtml,
        });

        // Admin email
        const adminHtml = buildCloudvynEmail({
          preheader: "New payment received",
          greeting: "Admin Notification",
          heading: "New Plan Purchase",
          message: `
            <p>A user has purchased a plan.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 0 auto; text-align: left;">
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Invoice #</td><td style="padding: 8px; border: 1px solid #ddd;">${invoiceNumber}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td><td style="padding: 8px; border: 1px solid #ddd;">${user.name || user.username || "N/A"}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #ddd;">${user.email}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Plan</td><td style="padding: 8px; border: 1px solid #ddd;">${verifiedPlanKey.toUpperCase()}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Payment ID</td><td style="padding: 8px; border: 1px solid #ddd;">${razorpay_payment_id}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Amount</td><td style="padding: 8px; border: 1px solid #ddd;">₹${plan.priceInPaise / 100}</td></tr>
            </table>
          `,
          ctaText: "View Dashboard",
          ctaLink: "https://cloudvyn.com/admin",
        });
        await sendEmail({
          to: process.env.EMAIL_USER || "abhishekmadoliya@gmail.com",
          subject: `New Payment: ${user.email} → ${verifiedPlanKey.toUpperCase()}`,
          html: adminHtml,
        });
      }
    } catch (emailErr) {
      console.error("[Payment] Failed to send upgrade emails:", emailErr.message);
    }

    res.json({
      success: true,
      message: `${verifiedPlanKey.toUpperCase()} plan activated until ${paidUntil.toLocaleDateString("en-IN")}.`,
      invoiceNumber,
      subscription: {
        planKey: sub.planKey,
        paidUntil: sub.paidUntil,
        interviewsUsed: sub.interviewsUsedThisCycle,
        cycleEnd: sub.cycleEnd,
      },
    });
  } catch (err) {
    console.error("POST /subscriptions/verify-payment error:", err.message);
    res.status(500).json({ success: false, message: "Payment verification failed." });
  }
});

/**
 * GET /api/subscriptions/receipts
 * Fetch all payment receipts for the logged-in candidate.
 */
subscriptionRouter.get("/receipts", requireAuth, async (req, res) => {
  try {
    const userId = req.dbUser._id;
    const userIdStr = userId.toString();

    // Query across ObjectId, String, and payload references
    const events = await PaymentEvent.find({
      $or: [
        { userId: userId },
        { userId: userIdStr },
        { "payload.userId": userIdStr },
        { "payload.notes.userId": userIdStr },
        { "payload.payment.entity.notes.userId": userIdStr },
      ],
      eventType: { $in: ["payment.verified", "payment.captured"] },
    }).sort({ processedAt: -1 });

    const user = req.dbUser;

    const receipts = events.map((ev) => {
      const p = ev.payload || {};
      const planKey = p.planKey || p.payment?.entity?.notes?.planKey || "plus";
      const amount = p.amount || (p.payment?.entity?.amount ? p.payment.entity.amount / 100 : (planKey === "pro" ? 150 : 50));
      const paymentId = p.paymentId || ev.razorpayEventId || p.payment?.entity?.id;
      const invoiceNumber = p.invoiceNumber || `INV-${new Date(ev.processedAt).getTime().toString().slice(-6)}-${(paymentId || "").slice(-4).toUpperCase()}`;

      return {
        id: ev.razorpayEventId,
        invoiceNumber,
        orderId: p.orderId || p.payment?.entity?.order_id || null,
        paymentId: paymentId,
        planKey,
        planName: p.planName || (planKey === "pro" ? "Pro Plan" : "Plus Plan"),
        amount,
        currency: p.currency || "INR",
        paidAt: ev.processedAt,
        validUntil: p.paidUntil || null,
        status: "Paid",
        customerName: user.name || user.username || "Candidate",
        customerEmail: user.email || "",
      };
    });

    // Fallback: If no receipts found in events, but user has an active paid subscription
    if (receipts.length === 0) {
      const sub = await Subscription.findOne({ userId });
      if (sub && sub.planKey !== "free" && sub.lastPaymentId) {
        const plan = await Plan.findOne({ key: sub.planKey });
        const invoiceNumber = `INV-${new Date(sub.createdAt || Date.now()).getTime().toString().slice(-6)}-${sub.lastPaymentId.slice(-4).toUpperCase()}`;
        receipts.push({
          id: sub.lastPaymentId,
          invoiceNumber,
          orderId: sub.lastOrderId || null,
          paymentId: sub.lastPaymentId,
          planKey: sub.planKey,
          planName: plan?.name || (sub.planKey === "pro" ? "Pro Plan" : "Plus Plan"),
          amount: plan?.priceInPaise ? plan.priceInPaise / 100 : (sub.planKey === "pro" ? 150 : 50),
          currency: "INR",
          paidAt: sub.cycleStart || sub.createdAt || new Date(),
          validUntil: sub.paidUntil || sub.cycleEnd || null,
          status: "Paid",
          customerName: user.name || user.username || "Candidate",
          customerEmail: user.email || "",
        });
      }
    }

    res.json({ success: true, receipts });
  } catch (err) {
    console.error("GET /subscriptions/receipts error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch payment receipts" });
  }
});

/**
 * GET /api/subscriptions/receipt/:paymentId
 * Fetch full invoice / receipt details for print / download.
 */
subscriptionRouter.get("/receipt/:paymentId", requireAuth, async (req, res) => {
  try {
    const userId = req.dbUser._id;
    const userIdStr = userId.toString();
    const { paymentId } = req.params;

    let ev = await PaymentEvent.findOne({
      $or: [
        { userId: userId },
        { userId: userIdStr },
        { "payload.userId": userIdStr },
      ],
      razorpayEventId: paymentId,
    });

    const user = req.dbUser;
    let p = ev?.payload || {};
    let planKey = p.planKey || "plus";
    let amount = p.amount || (planKey === "pro" ? 150 : 50);
    let invoiceNumber = p.invoiceNumber || `INV-${new Date(ev?.processedAt || Date.now()).getTime().toString().slice(-6)}-${paymentId.slice(-4).toUpperCase()}`;
    let paidAt = ev?.processedAt || new Date();
    let validUntil = p.paidUntil || null;
    let orderId = p.orderId || null;

    if (!ev) {
      const sub = await Subscription.findOne({ userId, lastPaymentId: paymentId });
      if (sub) {
        planKey = sub.planKey;
        const plan = await Plan.findOne({ key: sub.planKey });
        amount = plan?.priceInPaise ? plan.priceInPaise / 100 : (sub.planKey === "pro" ? 150 : 50);
        paidAt = sub.cycleStart || sub.createdAt || new Date();
        validUntil = sub.paidUntil || null;
        orderId = sub.lastOrderId || null;
      } else {
        return res.status(404).json({ success: false, message: "Receipt not found." });
      }
    }

    res.json({
      success: true,
      receipt: {
        invoiceNumber,
        paymentId,
        orderId,
        planKey,
        planName: planKey === "pro" ? "Pro Plan" : "Plus Plan",
        description: `Cloudvyn ${planKey.toUpperCase()} 30-Day Access (AI Mock Interviews & Prep Resources)`,
        amount,
        currency: "INR",
        paidAt,
        validUntil,
        status: "PAID",
        customer: {
          name: user.name || user.username || "Candidate",
          email: user.email,
        },
        company: {
          name: "Cloudvyn Technologies",
          website: "https://www.cloudvyn.com",
          supportEmail: "support@cloudvyn.com",
          taxNote: "Amount is inclusive of applicable GST/taxes.",
        },
      },
    });
  } catch (err) {
    console.error("GET /subscriptions/receipt/:paymentId error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch receipt details" });
  }
});

export default subscriptionRouter;
