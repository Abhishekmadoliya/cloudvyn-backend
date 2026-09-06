import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sendEmail, verifyEmailConnection, buildCloudvynEmail } from "../src/utils/sendEmail.js";

// Load .env from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runTest() {
  console.log("==================================================");
  console.log("🔍 Testing Hostinger SMTP Configuration");
  console.log("==================================================");
  console.log(`EMAIL_HOST      : ${process.env.EMAIL_HOST || "smtp.hostinger.com (default)"}`);
  console.log(`EMAIL_PORT      : ${process.env.EMAIL_PORT || "465 (default)"}`);
  console.log(`EMAIL_USER      : ${process.env.EMAIL_USER || "❌ NOT SET"}`);
  console.log(`EMAIL_PASS      : ${process.env.EMAIL_PASS ? "********" : "❌ NOT SET"}`);
  console.log(`EMAIL_FROM      : ${process.env.EMAIL_FROM || "Auto-generated"}`);
  console.log(`EMAIL_FROM_NAME : ${process.env.EMAIL_FROM_NAME || "Cloudvyn (default)"}`);
  console.log("==================================================\n");

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ ERROR: Please set EMAIL_USER and EMAIL_PASS in be/.env before testing.");
    process.exit(1);
  }

  // 1. Verify SMTP Connection Handshake
  console.log("1️⃣ Verifying connection with Hostinger SMTP server...");
  const verification = await verifyEmailConnection();
  if (!verification.success) {
    console.error("\n❌ Verification Failed!");
    console.error("Diagnosis Hints:");
    console.error("1. Double check your EMAIL_USER (must be full email address, e.g., contact@cloudvyn.com)");
    console.error("2. Double check your EMAIL_PASS (email password created in Hostinger hPanel)");
    console.error("3. If using port 465, secure must be true. If using 587, secure must be false.");
    process.exit(1);
  }

  // 2. Send a test email
  const recipient = process.argv[2] || process.env.EMAIL_USER;
  console.log(`\n2️⃣ Sending test email to: ${recipient}...`);

  const testHtml = buildCloudvynEmail({
    preheader: "Test Email from Hostinger SMTP",
    greeting: "SMTP Test Passed!",
    heading: "Hostinger Email Setup Successful 🚀",
    message: `
      <p>This is a confirmation that your Hostinger company mail SMTP is properly configured and functional.</p>
      <p style="margin-top: 12px; color: #16a34a; font-weight: bold;">All authentication, TLS, and pooling layers are working as expected.</p>
    `,
    ctaText: "Visit Cloudvyn",
    ctaLink: process.env.FRONTEND_URL || "https://www.cloudvyn.com",
  });

  try {
    const result = await sendEmail({
      to: recipient,
      subject: "Test Email: Hostinger SMTP is Working!",
      html: testHtml,
    });

    console.log("\n==================================================");
    console.log("🎉 SUCCESS! Email dispatched successfully.");
    console.log(`Message ID: ${result.messageId}`);
    console.log(`Delivered to: ${recipient}`);
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ Failed to dispatch test email:", err.message);
  }
}

runTest();
