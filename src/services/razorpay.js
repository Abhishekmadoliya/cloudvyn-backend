/**
 * razorpay.js — Razorpay client and wrapper functions.
 *
 * Uses the Razorpay Orders API for one-time payments (not subscriptions).
 *
 * Requires env vars:
 *   RAZORPAY_KEY_ID
 *   RAZORPAY_KEY_SECRET
 *   RAZORPAY_WEBHOOK_SECRET
 */

import Razorpay from "razorpay";
import crypto from "crypto";
import { configDotenv } from "dotenv";
import Plan from "../models/Plan.js";

configDotenv();

let _instance = null;

function getRazorpay() {
  if (!_instance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
    }
    _instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _instance;
}

/**
 * Create a Razorpay Order for a one-time payment.
 * Returns the Razorpay order object (contains id, amount, currency, etc.)
 */
export async function createOrder(planKey, userId) {
  const plan = await Plan.findOne({ key: planKey, active: true });
  if (!plan) throw new Error(`Plan '${planKey}' not found or inactive`);
  if (plan.priceInPaise <= 0) throw new Error(`Cannot create order for free plan`);

  const rzp = getRazorpay();

  // Receipt ID max length is 40 characters in Razorpay API
  const shortUserId = userId.toString().slice(-8);
  const receipt = `rcpt_${planKey}_${shortUserId}_${Date.now()}`.slice(0, 40);

  const order = await rzp.orders.create({
    amount: plan.priceInPaise,
    currency: "INR",
    receipt,
    notes: {
      planKey,
      userId: userId.toString(),
      planName: plan.name,
    },
  });

  return order;
}

/**
 * Fetch an order from Razorpay to verify its status and notes.
 */
export async function fetchOrder(orderId) {
  const rzp = getRazorpay();
  return await rzp.orders.fetch(orderId);
}

/**
 * Verify payment signature after Razorpay checkout completes.
 * This is called from the server-side /verify-payment route.
 *
 * Razorpay sends: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Signature = HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET not set");
  if (!orderId || !paymentId || !signature) return false;

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * Verify Razorpay webhook signature.
 * Returns true if the signature is valid.
 */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET not set");
  if (!signature || typeof signature !== "string") return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

export default getRazorpay;
