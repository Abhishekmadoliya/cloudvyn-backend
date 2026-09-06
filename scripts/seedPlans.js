/**
 * seedPlans.js — One-time script to insert / update the 3 pricing plan documents.
 *
 * Usage:  node scripts/seedPlans.js
 *
 * Idempotent: uses updateOne with upsert, so safe to run multiple times.
 */

import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import Plan from "../src/models/Plan.js";

configDotenv();

const PLANS = [
  {
    key: "free",
    name: "Free",
    priceInPaise: 0,
    interviewCap: 5,
    allowBYOK: false,
    languages: ["en"],
    features: {
      codeEditor: false,
      transcriptDownload: false,
      videoDownload: false,
      prioritySupport: false,
    },
    active: true,
  },
  {
    key: "plus",
    name: "Plus",
    priceInPaise: 5000, // ₹50 in paise
    interviewCap: 15,
    allowBYOK: true,
    languages: ["en"],
    features: {
      codeEditor: false,
      transcriptDownload: false,
      videoDownload: false,
      prioritySupport: false,
    },
    active: true,
  },
  {
    key: "pro",
    name: "Pro",
    priceInPaise: 15000, // ₹150 in paise
    interviewCap: 30,
    allowBYOK: true,
    languages: ["en", "hi"],
    features: {
      codeEditor: true,
      transcriptDownload: true,
      videoDownload: true,
      prioritySupport: true,
    },
    active: true,
  },
];

async function seed() {
  try {
    const mongoUri = process.env.db_connection_string;
    if (!mongoUri) {
      throw new Error("db_connection_string not set in environment.");
    }
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    for (const plan of PLANS) {
      const updateData = {
        name: plan.name,
        priceInPaise: plan.priceInPaise,
        interviewCap: plan.interviewCap,
        allowBYOK: plan.allowBYOK,
        languages: plan.languages,
        features: plan.features,
        active: plan.active,
      };

      const result = await Plan.updateOne(
        { key: plan.key },
        {
          $set: updateData,
          $unset: { razorpayPlanId: 1 }, // Clean up old field if present
        },
        { upsert: true }
      );

      const action = result.upsertedCount ? "CREATED" : "UPDATED";
      console.log(`  [${action}] Plan: ${plan.key} (${plan.name}) — ₹${plan.priceInPaise / 100}/mo, cap: ${plan.interviewCap}`);
    }

    console.log("\n✅ All plans seeded successfully.");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seed();
