/**
 * subscriptionCrons.js — Subscription lifecycle cron jobs.
 *
 * Uses node-cron (same pattern as blogCron.js).
 *
 * Jobs:
 *   1. Paid plan expiry downgrade — hourly
 *   2. Free-tier cycle reset      — hourly
 */

import cron from "node-cron";
import Subscription from "../models/Subscription.js";

let expiryDowngradeCron = null;
let freeCycleResetCron = null;

/**
 * Initialize all subscription cron jobs.
 * Call once at app startup.
 */
export function initSubscriptionCrons() {
  // ── 1. Paid plan expiry downgrade — every hour ──────────────────────────
  // Finds paid subs where paidUntil has passed → downgrades to free.
  expiryDowngradeCron = cron.schedule(
    "0 * * * *",
    async () => {
      console.log("[Cron:ExpiryDowngrade] Running paid plan expiry check...");
      try {
        const now = new Date();
        const result = await Subscription.updateMany(
          {
            planKey: { $ne: "free" },
            paidUntil: { $lt: now },
          },
          {
            $set: {
              planKey: "free",
              paidUntil: null,
              interviewsUsedThisCycle: 0,
              cycleStart: now,
              cycleEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            },
          }
        );
        if (result.modifiedCount > 0) {
          console.log(`[Cron:ExpiryDowngrade] Downgraded ${result.modifiedCount} expired subscriptions to free`);
        }
      } catch (err) {
        console.error("[Cron:ExpiryDowngrade] Error:", err.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
      runOnInit: false,
    }
  );

  console.log("[Cron] Paid plan expiry downgrade scheduled: hourly");

  // ── 2. Free-tier cycle reset — every hour ─────────────────────────────────
  // For free-tier subs whose cycle has ended: reset counter, roll forward 30 days.
  // Paid tiers are reset at payment time, NOT by this cron.
  freeCycleResetCron = cron.schedule(
    "30 * * * *", // Offset by 30 min to spread load
    async () => {
      console.log("[Cron:FreeCycleReset] Running free-tier cycle reset...");
      try {
        const now = new Date();
        const expiredFreeSubs = await Subscription.find({
          planKey: "free",
          cycleEnd: { $lt: now },
        });

        let resetCount = 0;
        for (const sub of expiredFreeSubs) {
          // Roll forward from the previous cycle end (not from now),
          // so cycles stay anchored to the original start date.
          const newCycleStart = new Date(sub.cycleEnd);
          const newCycleEnd = new Date(newCycleStart);
          newCycleEnd.setDate(newCycleEnd.getDate() + 30);

          sub.cycleStart = newCycleStart;
          sub.cycleEnd = newCycleEnd;
          sub.interviewsUsedThisCycle = 0;
          await sub.save();
          resetCount++;
        }

        if (resetCount > 0) {
          console.log(`[Cron:FreeCycleReset] Reset ${resetCount} free-tier subscriptions`);
        }
      } catch (err) {
        console.error("[Cron:FreeCycleReset] Error:", err.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
      runOnInit: false,
    }
  );

  console.log("[Cron] Free-tier cycle reset scheduled: hourly (at :30)");
}

/**
 * Stop all subscription cron jobs (for testing / graceful shutdown).
 */
export function stopSubscriptionCrons() {
  if (expiryDowngradeCron) expiryDowngradeCron.stop();
  if (freeCycleResetCron) freeCycleResetCron.stop();
  console.log("[Cron] Subscription cron jobs stopped.");
}
