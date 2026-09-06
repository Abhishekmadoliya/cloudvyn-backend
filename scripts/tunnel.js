import ngrok from "@ngrok/ngrok";
import { configDotenv } from "dotenv";

configDotenv();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
const authtoken = process.env.NGROK_AUTHTOKEN;

async function start() {
  try {
    const options = {
      addr: PORT,
    };

    if (authtoken && authtoken !== "your_ngrok_authtoken_here") {
      options.authtoken = authtoken;
    }

    console.log(`Starting ngrok tunnel for port ${PORT}...`);
    const listener = await ngrok.forward(options);

    const url = listener.url();
    console.log("\n=======================================================");
    console.log(`🚀 Ngrok Tunnel is LIVE!`);
    console.log(`🔗 Local Address:      http://localhost:${PORT}`);
    console.log(`🌐 Public Tunnel URL:   ${url}`);
    console.log(`🎯 Razorpay Webhook:   ${url}/api/webhooks/razorpay`);
    console.log("=======================================================\n");
    console.log("Keep this terminal open to keep the tunnel active. Press Ctrl+C to stop.\n");

    // Keep Node process alive
    process.stdin.resume();

    process.on("SIGINT", async () => {
      console.log("\nClosing ngrok tunnel...");
      try {
        await ngrok.disconnect();
      } catch {}
      process.exit(0);
    });
  } catch (err) {
    console.error("\n❌ Error starting ngrok tunnel:");
    if (err.message && (err.message.includes("authtoken") || err.message.includes("ERR_NGROK_4018") || err.message.includes("authentication"))) {
      console.error("👉 Please add NGROK_AUTHTOKEN=<your_token> to your .env file or get one from https://dashboard.ngrok.com/get-started/your-authtoken");
    } else {
      console.error(err.message || err);
    }
  }
}

start();
