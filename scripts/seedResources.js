import mongoose from "mongoose";
import dotenv from "dotenv";
import Resource from "../src/models/resourceModel.js";

dotenv.config();

const sampleResources = [
  {
    title: "FAANG DSA Core Patterns & Cheat Sheet",
    description: "Complete guide covering Sliding Window, Two Pointers, Fast & Slow Pointers, Monotonic Stack, Interval Merging, Tree BFS/DFS, Top K Elements, and Graph Algorithms with Python & Java templates.",
    category: "DSA Cheat Sheets",
    resourceType: "file",
    fileUrl: "https://raw.githubusercontent.com/cloudvyn/resources/main/dsa-core-patterns-cheatsheet.pdf",
    fileType: "pdf",
    fileSize: "3.4 MB",
    readTime: "45 min review",
    tags: ["DSA", "LeetCode", "Algorithms", "FAANG", "Interview Prep"],
    targetTier: ["plus", "pro"],
    isPublished: true,
    viewsCount: 142,
  },
  {
    title: "System Design Blueprint: Designing High-Throughput Distributed Systems",
    description: "Comprehensive blueprint for LLD/HLD rounds. Covers Rate Limiters, Distributed Caching (Redis/Memcached), Message Brokers (Kafka), DB Sharding, Consistent Hashing, and Resiliency Patterns.",
    category: "System Design",
    resourceType: "article",
    fileType: "article",
    readTime: "18 min read",
    tags: ["System Design", "HLD", "Kafka", "Microservices", "Scalability"],
    targetTier: ["plus", "pro"],
    isPublished: true,
    viewsCount: 289,
    content: `## System Design Framework for Senior & Staff Engineers

When tackling a high-throughput distributed system design interview, structured thinking is the key differentiator between mid-level and senior candidates.

### 1. Requirements Clarification & Scope (5-7 mins)
* **Functional Requirements**:
  * Write path: Clients can publish events/requests up to 100k RPS.
  * Read path: Clients query latest state with p99 latency < 50ms.
  * Analytics: Real-time aggregated metrics over rolling 1-hour windows.
* **Non-Functional Requirements**:
  * High Availability (99.99%) over strong consistency (Eventual Consistency acceptable).
  * Idempotency for retried writes.
  * Disaster recovery across multi-region AZs.

### 2. High-Level Architecture
1. **Edge Tier**: Cloudflare / AWS CloudFront for SSL termination & DDoS mitigation.
2. **API Gateway**: Kong / Envoy handling JWT auth, rate limiting (Token Bucket via Redis), and request routing.
3. **Ingestion Layer**: Stateless Go/Rust microservices pushing batch payloads to Apache Kafka.
4. **Processing Layer**: Apache Flink / Kafka Streams workers for real-time deduplication and stream aggregation.
5. **Storage Strategy**:
   * **Hot Data / Fast Reads**: Redis Cluster (LRU caching with 15-minute TTL).
   * **Transactional Entity Store**: PostgreSQL with read replicas and Citus sharding by \`tenant_id\` or \`user_id\`.
   * **Cold Analytics Store**: ClickHouse / Snowflake for columnar aggregation.

### 3. Deep Dive: Handling 100,000 writes/sec
* **Batching & Buffering**: Avoid single-record DB writes. Accumulate in-memory micro-batches (e.g. 500 records or 50ms) before streaming to Kafka partitions.
* **Partition Key Distribution**: Use uniform hashing (\`hash(userId) % partition_count\`) to prevent hotspotting.
* **Idempotency Keys**: Clients send unique \`idempotency_key\` (UUID v4). The gateway checks Redis with \`SET NX EX 86400\` before processing to prevent duplicate charges or actions.

### 4. Key Metrics & Failure Modes
* **Backpressure**: If consumer lag spikes on Kafka, scale consumer group pods horizontally via Kubernetes HPA.
* **Circuit Breaking**: Implement Resilience4j / Envoy circuit breakers on downstream database calls to fail gracefully.`,
  },
  {
    title: "Ultimate Behavioral Interview Guide: STAR Method & Leadership Principles",
    description: "Master Amazon's 16 Leadership Principles and Google's Googliness criteria. Includes 25+ real question breakdowns, storytelling structures, and conflict resolution frameworks.",
    category: "Behavioral Frameworks",
    resourceType: "article",
    fileType: "article",
    readTime: "12 min read",
    tags: ["Behavioral", "STAR Method", "Leadership", "Culture Fit", "HR Round"],
    targetTier: ["plus", "pro"],
    isPublished: true,
    viewsCount: 310,
    content: `## Mastering the STAR Framework for Behavioral Rounds

Engineering managers and hiring bars don't just assess technical competence — they evaluate ownership, communication clarity, and how you resolve high-stakes ambiguity.

### The STAR-L Matrix
* **Situation**: Set the context in 2-3 concise sentences. What was the company stage, team size, and immediate business crisis?
* **Task**: Define your explicit responsibility. Not what "we" did, but what *you* were accountable for delivering.
* **Action**: Spend 60% of your time here. Detail the technical trade-offs you evaluated, how you influenced stakeholders, and specific code/process decisions you executed.
* **Result**: Quantify business impact with hard metrics ($ saved, % latency reduced, uptime improved, team velocity increased).
* **Learning (The Secret 'L')**: What would you do differently today with deeper foresight?

### High-Impact Story Example: Conflict with Senior Architect
* **Situation**: During a migration from monolithic Ruby on Rails to Go microservices, the Lead Architect wanted to rewrite every service concurrently, which would freeze feature delivery for 6 months.
* **Action**: I conducted a benchmark POC on our highest-load payment webhook endpoint. I presented data showing an incremental strangler-fig pattern would de-risk the rollout while allowing feature teams to ship weekly.
* **Result**: Migrated our 3 bottleneck services with zero downtime, improved p99 latency by 74%, and avoided the 6-month product freeze.`,
  },
  {
    title: "ATS-Optimized Tech Resume Template (LaTeX & Docx)",
    description: "Battle-tested resume templates that have yielded interviews at Google, Microsoft, Uber, and high-growth YC startups. Clean typography and parsing-compliant structure.",
    category: "Resume Templates",
    resourceType: "file",
    fileUrl: "https://raw.githubusercontent.com/cloudvyn/resources/main/cloudvyn-ats-optimized-resume-template.docx",
    fileType: "doc",
    fileSize: "1.2 MB",
    readTime: "10 min setup",
    tags: ["Resume", "ATS", "Templates", "Career", "LaTeX"],
    targetTier: ["plus", "pro"],
    isPublished: true,
    viewsCount: 520,
  },
  {
    title: "Top 100 High-Frequency SQL & Database Query Guide",
    description: "Window functions (ROW_NUMBER, DENSE_RANK, NTILE), Recursive CTEs, indexing strategies (B-Tree vs GIN), query plan explanation (EXPLAIN ANALYZE), and database locking modes.",
    category: "Tech Deep Dives",
    resourceType: "file",
    fileUrl: "https://raw.githubusercontent.com/cloudvyn/resources/main/top-100-sql-interview-mastery.pdf",
    fileType: "pdf",
    fileSize: "4.8 MB",
    readTime: "30 min review",
    tags: ["SQL", "Databases", "PostgreSQL", "Query Optimization", "Backend"],
    targetTier: ["plus", "pro"],
    isPublished: true,
    viewsCount: 198,
  },
  {
    title: "Full Mock Interview Preparation Checklist & 7-Day Sprint Plan",
    description: "Step-by-step 7-day crash schedule before a tech onsite. Includes daily problem sets, mock session cadence, system design review slots, and mindset prep.",
    category: "Interview Prep Guides",
    resourceType: "file",
    fileUrl: "https://raw.githubusercontent.com/cloudvyn/resources/main/7-day-interview-sprint-checklist.pdf",
    fileType: "pdf",
    fileSize: "1.9 MB",
    readTime: "15 min read",
    tags: ["Checklist", "Preparation", "Sprint", "Mock Interview"],
    targetTier: ["plus", "pro"],
    isPublished: true,
    viewsCount: 421,
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cloudvyn";
    await mongoose.connect(mongoUri);
    console.log("Connected to DB for seeding resources...");

    for (const resData of sampleResources) {
      await Resource.findOneAndUpdate(
        { title: resData.title },
        resData,
        { upsert: true, new: true }
      );
    }

    console.log(`Successfully seeded ${sampleResources.length} resources!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seeding resources failed:", err);
    process.exit(1);
  }
}

seed();
