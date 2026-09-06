import express from "express";
import rateLimit from "express-rate-limit";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import Router from "./src/routes/categoryRoutes.js";
import { WebSocketServer } from "ws";
import { configDotenv } from "dotenv";
import { dbConnection } from "./src/config/db/dbConnection.js";
import { handleConnection } from "./src/events/wshandler.js";
import { chatRouter } from "./src/routes/chatRoutes.js";
import blogRouter from "./src/routes/blog/blogRoutes.js";

import questionRouter from "./src/routes/questionsRoute.js";
import predictTextRouter from "./src/routes/predict.routes.js";
import queryRouter from "./src/routes/queryRoutes.js";
import userRouter from './src/routes/user.routes.js'
import mockTestRouter from './src/routes/mockTestToutes.js';
import { profileRouter } from "./src/routes/candidateProfileRoutes.js";
import resumeRouter from "./src/routes/resumeRoutes.js";
import automationRouter from "./src/routes/automationRoutes.js";
import adminRouter from "./src/routes/admin/index.js";
import roadmapRouter from "./src/routes/roadmapRoutes.js";
import resourceRouter from "./src/routes/resourceRoutes.js";
import questionBankRouter from "./src/routes/questionBankRoutes.js";


// ── AI Feed routes ──────────────────────────────────────────────────────────
import feedRouter from './src/routes/feedRoutes.js';
import personaRouter from './src/routes/personaRoutes.js';
import commentRouter from './src/routes/commentRoutes.js';
import reactionRouter from './src/routes/reactionRoutes.js';
import topicRouter from './src/routes/topicRoutes.js';
import chatFeedRouter from './src/routes/chatFeedRoutes.js';
import ollamaRouter from './src/routes/ollamaRoutes.js';
import researchRouter from './src/routes/researchRoutes.js';
import { initFeedWorker } from './src/workers/feedGeneratorWorker.js';
import { interviewRouter } from "./src/routes/interview/interviewRoutes.js";
import interviewConfigRouter from "./src/routes/recruiter/interviewConfigRoutes.js";

// ── Blog Automation Pipeline ─────────────────────────────────────────────────
import blogAutomationRouter from './src/routes/blog/blogAutomationRoutes.js';
import { initBlogWorkers } from './src/workers/blog/index.js';
import { initBlogCron } from './src/cron/blogCron.js';
import linkdlnAutomationRouter from "./src/routes/blog/linkdlnRoutes.js";

// ── Group Discussion ──────────────────────────────────────────────────────────
import groupDiscussionRouter from "./src/routes/gdRoutes.js";

// ── Subscription & Payment ───────────────────────────────────────────────────
import subscriptionRouter from './src/routes/subscriptions.js';
import webhookRouter from './src/routes/webhooks.js';
import { initSubscriptionCrons } from './src/cron/subscriptionCrons.js';
import { jobApplyRouter } from "./src/routes/jobsApply/jobApplyRoutes.js";


// social automation routes





configDotenv();

const port = process.env.PORT || 8000;

const app = express();

// Trust proxy for IP-based rate limiting on Cloud Run / behind load balancers
app.set("trust proxy", 1);

app.use(cors({
  origin: [
    "https://www.cloudvyn.com",
    "https://cloudvyn.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://cortex.cloudvyn.com",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "https://console.cloudvyn.com",
    "http://console.cloudvyn.com",
    "http://app.cloudvyn.com",
    "https://app.cloudvyn.com",
    /\.local$/, // Allow local network devices
    /^http:\/\/192\.168\.\d+\.\d+:8081$/, // Common LAN IPs
    /^http:\/\/10\.0\.2\.2:\d+$/ // Android Emulator
  ],
  credentials: true
}));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), host: req.headers.host });
});

// Request Logger - MUST BE BEFORE OTHER ROUTES
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'N/A'}`);
  next();
});

// Webhook route MUST be mounted BEFORE express.json() so it gets the raw body
// for Razorpay signature verification. It uses its own express.raw() parser.
app.use('/api/webhooks', webhookRouter);

// middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." }
});

// routes
app.get("/", (req, res) => res.send("API running"));

// Apply rate limiter to all /api routes (this leaves WebSockets unaffected)
// app.use("/api", apiLimiter);

app.use("/cat", Router);

app.use("/api/user", userRouter)
app.use("/api/question", questionRouter);
app.use("/api/chat", chatRouter);
app.use("/api/predict", predictTextRouter);
app.use("/api/query", queryRouter);
app.use('/api/mock-tests', mockTestRouter);
app.use('/api/candidate', profileRouter)
app.use('/api/resume', resumeRouter);
app.use('/api/automations', automationRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/interview-config', interviewConfigRouter);
app.use('/api/roadmaps', roadmapRouter);
app.use('/api/resources', resourceRouter);
app.use('/api/question-bank', questionBankRouter);


// ── Subscription & Payment ────────────────────────────────────────────────
app.use('/api/subscriptions', subscriptionRouter);

// ── Centralized Admin Router ──────────────────────────────────────────────
app.use('/api/admin', adminRouter);

// ── AI Feed ────────────────────────────────────────────────────────────────
app.use('/api/feed', feedRouter);
app.use('/api/persona', personaRouter);
app.use('/api/comment', commentRouter);
app.use('/api/reaction', reactionRouter);
app.use('/api/topic', topicRouter);
app.use('/api/feed/chat', chatFeedRouter);
app.use('/api/ollama', ollamaRouter);
app.use('/api/research', researchRouter);

// ── Blog Automation Pipeline ─────────────────────────────────────────────────
app.use('/api/blog', blogAutomationRouter);
app.use('/api/blogpost', blogRouter);

// app.use('/api/social-automation/linkdln', linkdlnAutomationRouter);

app.use('/api/gd', groupDiscussionRouter)

// auto jobs apply automation routes
app.use('/api/jobapply', jobApplyRouter)
// DB connection
dbConnection();

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), host: req.headers.host });
});

// Start Background Workers
// initFeedWorker();

// Start Blog Pipeline Workers (BullMQ)
// initBlogWorkers();

// Start Blog Cron Jobs (daily 9 AM IST + weekly analytics)
// initBlogCron();

// Start Subscription Cron Jobs (paid plan expiry, free-tier cycle reset)
initSubscriptionCrons();

const server = http.createServer(app);

const wss = new WebSocketServer({ server });
// start ws server
wss.on("connection", handleConnection);

const HOST = "0.0.0.0"; // Explicitly bind to all interfaces
server.listen(port, HOST, () => {
  console.log(`API + WebSocket running on http://${HOST}:${port}`);
});
