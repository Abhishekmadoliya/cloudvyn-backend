/**
 * migrateSubscriptions.js — Migration script to migrate legacy subscriptions to One-Time Payment schema.
 *
 * Usage:  node scripts/migrateSubscriptions.js
 */

import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import Subscription from "../src/models/Subscription.js";

configDotenv();

async function migrate() {
  try {
    const mongoUri = process.env.db_connection_string;
    if (!mongoUri) {
      throw new Error("db_connection_string not set in environment.");
    }
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB for migration");

    const rawCollection = mongoose.connection.collection("subscriptions");
    const cursor = rawCollection.find({});
    const total = await rawCollection.countDocuments();
    console.log(`Found ${total} subscription documents to check/migrate.`);

    let migrated = 0;
    const now = new Date();

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const planKey = doc.planKey || "free";
      let paidUntil = doc.paidUntil || null;

      // If legacy document has status and currentCycleEnd
      if (!paidUntil && planKey !== "free") {
        if (doc.status === "active" || doc.status === "grace_period") {
          paidUntil = doc.currentCycleEnd ? new Date(doc.currentCycleEnd) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else if (doc.status === "cancelled" && doc.currentCycleEnd && new Date(doc.currentCycleEnd) > now) {
          paidUntil = new Date(doc.currentCycleEnd);
        }
      }

      const cycleStart = doc.cycleStart || doc.currentCycleStart || now;
      const cycleEnd = doc.cycleEnd || doc.currentCycleEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await rawCollection.updateOne(
        { _id: doc._id },
        {
          $set: {
            planKey,
            paidUntil,
            cycleStart,
            cycleEnd,
            interviewsUsedThisCycle: doc.interviewsUsedThisCycle || 0,
            lastPaymentId: doc.lastPaymentId || null,
            lastOrderId: doc.lastOrderId || null,
          },
          $unset: {
            status: 1,
            razorpaySubscriptionId: 1,
            byokActiveThisCycle: 1,
            gracePeriodEndsAt: 1,
            currentCycleStart: 1,
            currentCycleEnd: 1,
          },
        }
      );
      migrated++;
    }

    console.log(`\n✅ Migration complete: Successfully updated ${migrated} subscriptions.`);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

migrate();
