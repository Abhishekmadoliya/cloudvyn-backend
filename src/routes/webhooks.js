/**
 * webhooks.js — Razorpay webhook receiver (Safety Net).
 *
 * POST /api/webhooks/razorpay
 *
 * In the one-time payment model, the PRIMARY activation path is
 * POST /api/subscriptions/verify-payment (called by the frontend).
 *
 * This webhook is a BACKUP — it handles:
 *   - payment.captured  → Activate plan (if not already done by verify-payment)
 *   - payment.failed    → Log for monitoring
 *
 * Idempotent via PaymentEvent collection.
 */

import express from "express";
import Subscription from "../models/Subscription.js";
import PaymentEvent from "../models/PaymentEvent.js";
import Plan from "../models/Plan.js";
import userModel from "../models/userModel.js";
import { verifyWebhookSignature, fetchOrder } from "../services/razorpay.js";
import { sendEmail, buildCloudvynEmail } from "../utils/sendEmail.js";

const webhookRouter = express.Router();

webhookRouter.post(
  "/razorpay",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    try {
      console.log(`\n================== [RAZORPAY WEBHOOK RECEIVED] ==================`);
      console.log(`[Webhook] Time: ${new Date().toISOString()}`);

      const signature = req.headers["x-razorpay-signature"];
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

      // 1. Verify signature
      if (!signature || !verifyWebhookSignature(rawBody, signature)) {
        console.warn("[Webhook] ❌ Invalid signature — rejecting request");
        return res.status(400).json({ error: "Invalid signature" });
      }

      console.log("[Webhook] ✅ Signature verified");
      const event = JSON.parse(rawBody);
      const eventId =
        event.event_id || event.payload?.payment?.entity?.id || `evt_${Date.now()}`;
      const eventType = event.event;

      console.log(`[Webhook] Event: ${eventType} (${eventId})`);

      // 2. Idempotency guard
      try {
        await PaymentEvent.create({
          razorpayEventId: eventId,
          eventType,
          payload: event,
          processedAt: new Date(),
        });
      } catch (dupErr) {
        if (dupErr.code === 11000) {
          console.log(`[Webhook] Event ${eventId} already recorded in PaymentEvent — checking activation`);
        } else {
          throw dupErr;
        }
      }

      // 3. Handle events
      switch (eventType) {
        case "payment.captured": {
          const payment = event.payload?.payment?.entity;
          if (!payment) {
            console.warn("[Webhook] No payment entity in payload");
            break;
          }

          const orderId = payment.order_id;
          const paymentId = payment.id;
          let planKey = payment.notes?.planKey;
          let userId = payment.notes?.userId;

          // If notes are missing on payment entity, fallback to fetching order details
          if ((!planKey || !userId) && orderId) {
            try {
              const rzpOrder = await fetchOrder(orderId);
              planKey = planKey || rzpOrder?.notes?.planKey;
              userId = userId || rzpOrder?.notes?.userId;
            } catch (fetchErr) {
              console.warn(`[Webhook] Could not fetch order ${orderId}:`, fetchErr.message);
            }
          }

          if (!planKey || !userId) {
            console.warn(`[Webhook] Missing notes (planKey/userId) in payment ${paymentId}`);
            break;
          }

          // Check if already activated by /verify-payment or earlier webhook
          const existingSub = await Subscription.findOne({
            userId,
            $or: [{ lastPaymentId: paymentId }, { lastOrderId: orderId }],
          });

          if (existingSub) {
            console.log(`[Webhook] Payment ${paymentId} already activated — skipping`);
            await PaymentEvent.updateOne({ razorpayEventId: eventId }, { userId });
            break;
          }

          // Backup activation: activate the plan
          const plan = await Plan.findOne({ key: planKey, active: true });
          if (!plan) {
            console.warn(`[Webhook] Plan '${planKey}' not found`);
            break;
          }

          const now = new Date();
          let paidUntil = new Date(now);
          paidUntil.setDate(paidUntil.getDate() + 30);

          /*
          // Stack remaining days if user has active plan (disabled for now)
          const currentSub = await Subscription.findOne({ userId });
          if (currentSub && currentSub.paidUntil && currentSub.paidUntil > now) {
            const remainingMs = currentSub.paidUntil.getTime() - now.getTime();
            paidUntil = new Date(paidUntil.getTime() + remainingMs);
          }
          */

          await Subscription.findOneAndUpdate(
            { userId },
            {
              planKey,
              paidUntil,
              lastPaymentId: paymentId,
              lastOrderId: orderId,
              interviewsUsedThisCycle: 0,
              cycleStart: now,
              cycleEnd: paidUntil,
            },
            { upsert: true, new: true }
          );

          const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${paymentId.slice(-4).toUpperCase()}`;
          await PaymentEvent.updateOne(
            { razorpayEventId: eventId },
            {
              userId,
              payload: {
                ...event,
                orderId,
                paymentId,
                planKey,
                planName: plan.name,
                amount: plan.priceInPaise / 100,
                currency: "INR",
                paidUntil,
                invoiceNumber,
                userId: userId.toString(),
              },
            }
          );
          console.log(`[Webhook] ✅ Backup activation: ${planKey} for user ${userId}, paid until ${paidUntil.toISOString()}`);

          // Send confirmation emails (non-blocking)
          try {
            const user = await userModel.findById(userId);
            if (user && user.email) {
              const candidateHtml = buildCloudvynEmail({
                preheader: `Your Cloudvyn ${planKey.toUpperCase()} plan is active.`,
                greeting: `Hello ${user.name || user.username || "Candidate"}`,
                heading: "Payment Successful 🎉",
                message: `
                  <p style="margin-top:0;">Your account has been upgraded to the <strong>${planKey.toUpperCase()} Plan</strong>.</p>
                  <p>Your plan is active until <strong>${paidUntil.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>.</p>
                  <p>You now have access to premium features, including more AI mock interviews and detailed analytics.</p>
                `,
                ctaText: "Go to Dashboard",
                ctaLink: `${process.env.FRONTEND_URL || "https://www.cloudvyn.com"}/dashboard`,
              });
              await sendEmail({
                to: user.email,
                subject: `Cloudvyn ${planKey.toUpperCase()} Plan Activated`,
                html: candidateHtml,
              });
            }
          } catch (emailErr) {
            console.error("[Webhook] Failed to send upgrade email:", emailErr.message);
          }

          break;
        }

        case "payment.failed": {
          const payment = event.payload?.payment?.entity;
          console.warn(
            `[Webhook] Payment failed: ${payment?.id || "unknown"} — reason: ${payment?.error_description || "N/A"}`
          );
          // No state change needed — user stays on current plan
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${eventType}`);
      }

      // Always respond 200 to acknowledge
      res.status(200).json({ status: "processed" });
    } catch (err) {
      console.error("[Webhook] Error:", err.message);
      // Return 500 for transient errors so Razorpay retries
      res.status(500).json({ status: "error" });
    }
  }
);

export default webhookRouter;
