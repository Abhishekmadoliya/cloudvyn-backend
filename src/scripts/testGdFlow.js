import { configDotenv } from "dotenv";
import { dbConnection } from "../config/db/dbConnection.js";
import GDTopic from "../models/gd/gdTopicModel.js";
import GDSession from "../models/gd/gdSessionModel.js";
import { initGdRoom, processUtterance, finalizeGdSession } from "../services/gd/gdOrchestrator.js";

configDotenv();

async function runTest() {
  console.log("Starting GD Flow E2E Integration Test...");
  await dbConnection();

  const testSessionId = `test_gd_${Date.now()}`;
  const userId = "test_user_123";

  // 1. Seed sample topic
  const topicText = "Should India adopt a 4-day work week?";
  let topic = await GDTopic.findOne({ text: topicText });
  if (!topic) {
    topic = await GDTopic.create({
      text: topicText,
      category: "current_affairs",
      difficulty: "medium",
      suggestedStances: ["for", "against", "neutral"],
      isSeed: true,
    });
  }
  console.log("✅ Topic resolved:", topic.text);

  // 2. Initialize GD Room
  const room = await initGdRoom(testSessionId, userId, {
    topicId: topic._id,
    userName: "Abhishek",
    userStance: "for",
  });
  console.log("✅ GD Room Initialized. Participants:", room.participants.map((p) => p.name).join(", "));

  // 3. Simulate Human Utterance
  console.log("🎙️ Candidate Abhishek speaking...");
  const candidateUtterance = "I believe adopting a 4-day work week will significantly boost employee productivity and mental health, leading to lower burnout rate in Indian tech companies.";
  await processUtterance(testSessionId, userId, "Abhishek", candidateUtterance, "human");

  console.log("\n--- Transcript after turns ---");
  const currentRoom = await GDSession.findOne({ sessionId: testSessionId });
  currentRoom.transcript.forEach((t) => {
    console.log(`[${t.speakerName} (${t.archetype || t.speakerType})]: ${t.text}`);
  });

  // 4. Finalize session and generate report
  console.log("\n📊 Finalizing session and generating AI Report...");
  const finalizedSession = await finalizeGdSession(testSessionId);
  console.log("\n✅ Overall Score:", finalizedSession.report.overallScore);
  console.log("✅ Rubric Scores:", JSON.stringify(finalizedSession.report.rubricScores, null, 2));
  console.log("✅ Strengths:", finalizedSession.report.strengths);
  console.log("✅ Summary:", finalizedSession.report.fullTranscriptSummary);

  console.log("\n🎉 GD Backend Test Completed Successfully!");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ GD Flow Test Failed:", err);
  process.exit(1);
});
