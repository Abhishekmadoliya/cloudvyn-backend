// ─────────────────────────────────────────────────────────────────────────────
// codingChallenge.service.js
// Generates role-tailored coding challenges for live technical interviews.
// Supports Frontend (HTML/CSS/JS, React, UI), Backend (Node.js, APIs, System),
// Fullstack, and Data Structures & Algorithms.
// ─────────────────────────────────────────────────────────────────────────────

import { generateWithFallback } from "./aiFallback.service.js";

/**
 * Curated high-yield problems categorized by role and domain.
 */
const CURATED_PROBLEMS = {
  frontend: [
    {
      problemId: "fe-debounce-autocomplete",
      title: "Interactive Autocomplete / Typeahead Search Component",
      category: "Frontend Development",
      difficulty: "Medium",
      problemType: "frontend_component",
      description: "Build an interactive Search Autocomplete / Typeahead component. The component should accept a list of items or fetch from an API mock, debounce input events by 300ms, filter results in real-time, highlight matching substrings, and handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape).",
      requirements: [
        "Debounce user input to prevent excessive calculations/requests (300ms delay).",
        "Display suggestions dropdown with matching substring highlighted or styled.",
        "Support keyboard navigation (Arrow Down, Arrow Up to select, Enter to choose, Escape to close).",
        "Handle empty states, loading states, and edge cases gracefully."
      ],
      examples: [
        {
          input: 'User types "re" in search input with items ["React", "Redux", "Rust", "Ruby"]',
          output: 'Dropdown shows ["React", "Redux"] with "Re" highlighted',
          explanation: "Case-insensitive prefix match filtered and rendered."
        }
      ],
      constraints: [
        "Pure JavaScript / React / HTML+CSS+JS in a single file.",
        "Zero external libraries for debouncing (implement your own debounce utility).",
        "Accessible keyboard navigation support."
      ],
      starterCode: {
        javascript: `// Frontend Autocomplete / Debounced Search Component
// You can write pure HTML+CSS+JS or React code here.

function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

class AutocompleteComponent {
  constructor(container, items) {
    this.container = container;
    this.items = items || [];
    this.selectedIndex = -1;
    this.init();
  }

  init() {
    // TODO: Create search input, suggestions list, and wire event listeners
    console.log("Autocomplete initialized with", this.items.length, "items");
  }

  filterItems(query) {
    // TODO: Implement case-insensitive filtering
  }

  handleKeyDown(event) {
    // TODO: Handle ArrowUp, ArrowDown, Enter, Escape
  }
}

// Example test run
const items = ["React", "Redux", "Remix", "Node.js", "Next.js", "TypeScript", "Tailwind CSS"];
const search = new AutocompleteComponent(null, items);
console.log("Ready to test search component!");
`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Autocomplete Search</title>
  <style>
    body { font-family: sans-serif; padding: 24px; background: #111; color: #fff; }
    .search-box { position: relative; width: 320px; }
    input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #333; background: #222; color: #fff; }
    .dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #1f1f1f; border: 1px solid #333; border-radius: 8px; margin-top: 4px; max-height: 200px; overflow-y: auto; display: none; }
    .item { padding: 8px 12px; cursor: pointer; }
    .item.active, .item:hover { background: #3b82f6; color: #fff; }
    .highlight { font-weight: bold; color: #60a5fa; }
  </style>
</head>
<body>
  <div class="search-box">
    <input type="text" id="searchInput" placeholder="Search technologies..." autocomplete="off">
    <div id="dropdown" class="dropdown"></div>
  </div>

  <script>
    // TODO: Implement debounced input listener and keyboard navigation
    const items = ["React", "Redux", "Remix", "Next.js", "Node.js", "TypeScript", "Tailwind"];
    console.log("Frontend UI ready!");
  </script>
</body>
</html>`,
        python: `# Python equivalent simulation for text search filtering
def autocomplete(query: str, items: list[str]) -> list[str]:
    query_lower = query.lower()
    return [item for item in items if query_lower in item.lower()]

items = ["React", "Redux", "Remix", "Next.js", "Node.js", "TypeScript", "Tailwind"]
print("Filtered results for 're':", autocomplete("re", items))
`,
        java: `import java.util.*;
import java.util.stream.Collectors;

public class Autocomplete {
    public static List<String> search(String query, List<String> items) {
        String q = query.toLowerCase();
        return items.stream()
            .filter(item -> item.toLowerCase().contains(q))
            .collect(Collectors.toList());
    }

    public static void main(String[] args) {
        List<String> items = Arrays.asList("React", "Redux", "Remix", "Node.js", "Next.js");
        System.out.println("Results for 're': " + search("re", items));
    }
}`,
        cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

std::vector<std::string> search(const std::string& query, const std::vector<std::string>& items) {
    std::vector<std::string> results;
    std::string q = query;
    std::transform(q.begin(), q.end(), q.begin(), ::tolower);
    for (const auto& item : items) {
        std::string lowerItem = item;
        std::transform(lowerItem.begin(), lowerItem.end(), lowerItem.begin(), ::tolower);
        if (lowerItem.find(q) != std::string::npos) {
            results.push_back(item);
        }
    }
    return results;
}

int main() {
    std::vector<std::string> items = {"React", "Redux", "Remix", "Node.js", "Next.js"};
    auto res = search("re", items);
    for (const auto& s : res) std::cout << s << std::endl;
    return 0;
}`
      }
    },
    {
      problemId: "fe-custom-accordion",
      title: "Interactive Accordion / Collapsible FAQ with Multi-Expand",
      category: "Frontend Development",
      difficulty: "Easy",
      problemType: "frontend_component",
      description: "Build an accessible, animated Accordion component in JavaScript/HTML/CSS or React. It must support multiple or single active tabs, smooth height animations, and full keyboard access (Enter/Space to toggle).",
      requirements: [
        "Support expanding and collapsing individual sections.",
        "Allow configuring whether multiple sections can be open simultaneously or only one at a time.",
        "Clean accessibility markup (aria-expanded, aria-controls, role='region')."
      ],
      examples: [
        {
          input: "User clicks Section 1, then clicks Section 2 (single-mode)",
          output: "Section 1 collapses smoothly, Section 2 expands.",
          explanation: "Single expand accordion behavior."
        }
      ],
      constraints: ["No external libraries", "Clean vanilla JS or React code"],
      starterCode: {
        javascript: `// Single-file Accordion Component Implementation
class Accordion {
  constructor(items, allowMultiple = false) {
    this.items = items || [];
    this.allowMultiple = allowMultiple;
    this.openIndexes = new Set();
  }

  toggle(index) {
    if (this.openIndexes.has(index)) {
      this.openIndexes.delete(index);
    } else {
      if (!this.allowMultiple) {
        this.openIndexes.clear();
      }
      this.openIndexes.add(index);
    }
    this.render();
  }

  render() {
    console.log("Currently Open Sections:", Array.from(this.openIndexes));
  }
}

const faq = new Accordion([
  { title: "What is CloudVyn?", content: "AI-powered interview & career platform." },
  { title: "How does VAD work?", content: "Detects speech endpoints automatically using Silero VAD." }
]);
faq.toggle(0);
`,
        html: `<!DOCTYPE html>
<html>
<head>
  <style>
    .accordion-header { background: #222; color: #fff; padding: 12px; cursor: pointer; border: 1px solid #333; }
    .accordion-body { padding: 12px; background: #1a1a1a; color: #ccc; display: none; }
    .accordion-body.open { display: block; }
  </style>
</head>
<body>
  <div id="accordion-root"></div>
  <script>
    // TODO: Wire up accordion click handlers
  </script>
</body>
</html>`
      }
    }
  ],

  backend: [
    {
      problemId: "be-lru-cache",
      title: "Design and Implement an In-Memory LRU Cache",
      category: "Backend Development",
      difficulty: "Medium",
      problemType: "algorithm_function",
      description: "Implement a Least Recently Used (LRU) Cache class with a fixed capacity. Both `get(key)` and `put(key, value)` operations must run in O(1) average time complexity.",
      requirements: [
        "`get(key)`: Return the value of the key if it exists in the cache, otherwise return -1. Accessing a key marks it as recently used.",
        "`put(key, value)`: Update the value if key exists. Otherwise, insert the key-value pair. If capacity is exceeded, evict the least recently used key.",
        "Must achieve O(1) time complexity for both get and put operations."
      ],
      examples: [
        {
          input: 'cache = new LRUCache(2); cache.put(1, 1); cache.put(2, 2); cache.get(1); cache.put(3, 3); cache.get(2);',
          output: 'cache.get(1) returns 1; cache.get(2) returns -1 (evicted)',
          explanation: 'When key 3 is added, key 2 is evicted because key 1 was accessed more recently.'
        }
      ],
      constraints: [
        "1 <= capacity <= 3000",
        "0 <= key <= 10^4",
        "0 <= value <= 10^5",
        "O(1) average time complexity for both get and put"
      ],
      starterCode: {
        javascript: `/**
 * LRU Cache implementation
 * Tip: Combine a Doubly Linked List with a Map/Hash for O(1) lookups and removals.
 */
class LRUCache {
  /**
   * @param {number} capacity
   */
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  /** 
   * @param {number} key
   * @return {number}
   */
  get(key) {
    if (!this.cache.has(key)) return -1;
    const value = this.cache.get(key);
    // Refresh position to mark as recently used
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /** 
   * @param {number} key 
   * @param {number} value
   * @return {void}
   */
  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict least recently used (first key in Map)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}

// Test verification
const lru = new LRUCache(2);
lru.put(1, 1);
lru.put(2, 2);
console.log("get(1):", lru.get(1)); // returns 1
lru.put(3, 3);                       // evicts key 2
console.log("get(2):", lru.get(2)); // returns -1
lru.put(4, 4);                       // evicts key 1
console.log("get(1):", lru.get(1)); // returns -1
console.log("get(3):", lru.get(3)); // returns 3
console.log("get(4):", lru.get(4)); // returns 4
`,
        python: `class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}  # In Python 3.7+, dict preserves insertion order

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        val = self.cache.pop(key)
        self.cache[key] = val
        return val

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.pop(key)
        elif len(self.cache) >= self.capacity:
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        self.cache[key] = value

# Test
cache = LRUCache(2)
cache.put(1, 1)
cache.put(2, 2)
print("get(1):", cache.get(1))  # 1
cache.put(3, 3)                # evicts 2
print("get(2):", cache.get(2))  # -1
`,
        java: `import java.util.LinkedHashMap;
import java.util.Map;

class LRUCache {
    private final int capacity;
    private final LinkedHashMap<Integer, Integer> map;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new LinkedHashMap<Integer, Integer>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
                return size() > LRUCache.this.capacity;
            }
        };
    }

    public int get(int key) {
        return map.getOrDefault(key, -1);
    }

    public void put(int key, int value) {
        map.put(key, value);
    }

    public static void main(String[] args) {
        LRUCache cache = new LRUCache(2);
        cache.put(1, 1);
        cache.put(2, 2);
        System.out.println("get(1): " + cache.get(1));
        cache.put(3, 3);
        System.out.println("get(2): " + cache.get(2));
    }
}`,
        cpp: `#include <iostream>
#include <unordered_map>
#include <list>

class LRUCache {
    int capacity;
    std::list<std::pair<int, int>> order;
    std::unordered_map<int, std::list<std::pair<int, int>>::iterator> map;

public:
    LRUCache(int cap) : capacity(cap) {}

    int get(int key) {
        auto it = map.find(key);
        if (it == map.end()) return -1;
        order.splice(order.begin(), order, it->second);
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = map.find(key);
        if (it != map.end()) {
            it->second->second = value;
            order.splice(order.begin(), order, it->second);
            return;
        }
        if (order.size() >= capacity) {
            int oldestKey = order.back().first;
            order.pop_back();
            map.erase(oldestKey);
        }
        order.emplace_front(key, value);
        map[key] = order.begin();
    }
};

int main() {
    LRUCache cache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    std::cout << "get(1): " << cache.get(1) << std::endl;
    cache.put(3, 3);
    std::cout << "get(2): " << cache.get(2) << std::endl;
    return 0;
}`
      }
    },
    {
      problemId: "be-rate-limiter",
      title: "Implement Token Bucket Rate Limiter Middleware",
      category: "Backend Development",
      difficulty: "Medium",
      problemType: "system_middleware",
      description: "Implement a sliding-window or token bucket rate limiter in Node.js / Python. The rate limiter should allow up to `maxRequests` per `windowMs` per client IP or user ID. If the limit is exceeded, return 429 Too Many Requests with a `Retry-After` calculation.",
      requirements: [
        "Track request timestamps per client IP / key.",
        "Cleanly expire old timestamps outside the sliding window.",
        "Allow requests if count < maxRequests, otherwise reject with retry timestamp."
      ],
      examples: [
        {
          input: "Client makes 5 requests in 10s with limit of 3 requests per 10s",
          output: "Requests 1-3 succeed, requests 4 & 5 return status 429 Too Many Requests",
          explanation: "Limit exceeded within the current sliding time window."
        }
      ],
      constraints: ["Memory-efficient cleanup", "Accurate sliding window timing"],
      starterCode: {
        javascript: `// Token Bucket / Sliding Window Rate Limiter
class RateLimiter {
  constructor(maxRequests = 5, windowMs = 10000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map(); // ip -> Array of timestamps
  }

  isAllowed(clientId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, [now]);
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    const timestamps = this.clients.get(clientId).filter(ts => ts > windowStart);
    
    if (timestamps.length < this.maxRequests) {
      timestamps.push(now);
      this.clients.set(clientId, timestamps);
      return { allowed: true, remaining: this.maxRequests - timestamps.length };
    }

    const oldest = timestamps[0];
    const retryAfterMs = (oldest + this.windowMs) - now;
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }
}

// Test
const limiter = new RateLimiter(3, 5000);
const ip = "192.168.1.1";
console.log("Req 1:", limiter.isAllowed(ip)); // allowed
console.log("Req 2:", limiter.isAllowed(ip)); // allowed
console.log("Req 3:", limiter.isAllowed(ip)); // allowed
console.log("Req 4:", limiter.isAllowed(ip)); // rejected
`,
        python: `import time

class RateLimiter:
    def __init__(self, max_requests: int = 5, window_seconds: float = 10.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients = {}  # client_id -> list of timestamps

    def is_allowed(self, client_id: str) -> dict:
        now = time.time()
        window_start = now - self.window_seconds

        timestamps = self.clients.get(client_id, [])
        valid_timestamps = [ts for ts in timestamps if ts > window_start]

        if len(valid_timestamps) < self.max_requests:
            valid_timestamps.append(now)
            self.clients[client_id] = valid_timestamps
            return {"allowed": True, "remaining": self.max_requests - len(valid_timestamps)}

        retry_after = (valid_timestamps[0] + self.window_seconds) - now
        return {"allowed": False, "retry_after": max(0.0, retry_after)}

# Test
limiter = RateLimiter(max_requests=3, window_seconds=5.0)
for i in range(1, 6):
    print(f"Request {i}:", limiter.is_allowed("user_123"))
`
      }
    }
  ],

  fullstack: [
    {
      problemId: "fs-async-task-pool",
      title: "Concurrent Async Task Queue with Pool Throttling",
      category: "Fullstack / Systems",
      difficulty: "Medium",
      problemType: "algorithm_function",
      description: "Implement a concurrent Promise task runner `taskPool(tasks, concurrency)` that executes an array of asynchronous tasks with a maximum concurrency limit. Results must be returned in the original task index order.",
      requirements: [
        "Execute at most `concurrency` tasks simultaneously.",
        "As soon as one task resolves, immediately pick up the next task in queue.",
        "Preserve original task order in the final resolved array."
      ],
      examples: [
        {
          input: "taskPool([task1(200ms), task2(100ms), task3(50ms)], 2)",
          output: "[result1, result2, result3]",
          explanation: "Tasks 1 and 2 start simultaneously. When task 2 finishes in 100ms, task 3 begins immediately."
        }
      ],
      constraints: ["Handle task errors cleanly", "Must return results in original order"],
      starterCode: {
        javascript: `/**
 * Executes async tasks with maximum concurrency limit.
 * @param {Array<() => Promise<any>>} tasks
 * @param {number} concurrency
 * @returns {Promise<Array<any>>}
 */
async function taskPool(tasks, concurrency = 2) {
  const results = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex++;
      try {
        results[currentIndex] = await tasks[currentIndex]();
      } catch (err) {
        results[currentIndex] = { error: err.message };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Test Run
const sleep = (ms, val) => () => new Promise(res => setTimeout(() => {
  console.log("Completed:", val);
  res(val);
}, ms));

const tasks = [
  sleep(300, "Task A (300ms)"),
  sleep(100, "Task B (100ms)"),
  sleep(200, "Task C (200ms)"),
  sleep(50,  "Task D (50ms)"),
];

taskPool(tasks, 2).then(results => {
  console.log("All tasks completed in order:", results);
});
`
      }
    }
  ]
};

/**
 * Selects or generates a tailored coding challenge for an interview session.
 * @param {object} context - Interview context (category, targetRole, skills, difficulty, etc.)
 * @returns {Promise<object>} Structured coding challenge
 */
export async function getCodingChallengeForInterview(context) {
  const category = (context.category || "").toLowerCase();
  const role = (context.targetRole || "").toLowerCase();
  const skills = (context.skills || []).map(s => s.toLowerCase());

  // Determine domain
  let domain = "backend";
  if (
    category.includes("frontend") ||
    category.includes("mobile") ||
    role.includes("frontend") ||
    role.includes("react") ||
    role.includes("ui") ||
    skills.includes("react") ||
    skills.includes("html") ||
    skills.includes("javascript")
  ) {
    domain = "frontend";
  } else if (category.includes("fullstack") || role.includes("fullstack")) {
    domain = "fullstack";
  } else {
    domain = "backend";
  }

  // Attempt dynamic LLM generation for maximum personalization if API key is configured
  try {
    const prompt = `You are a Principal Software Engineer crafting a live coding interview question.
Create an engaging, practical coding problem tailored to this candidate:
- Target Role: ${context.targetRole || "Software Engineer"}
- Category / Domain: ${context.category || domain}
- Technical Skills: ${(context.skills || []).join(", ") || "Core Programming"}
- Difficulty: ${context.difficultyLevel || "Medium"}
- Candidate Experience: ${context.experience || "1-3 years"}
${context.jobDescription ? `- Job Description: ${context.jobDescription.slice(0, 500)}` : ""}

Rules for the problem:
1. If DSA (Data Structures & Algorithms), ask for a classic algorithmic problem (e.g. graph traversal, binary tree operations, dynamic programming, sliding window, two pointers, heap/priority queue) with test cases.
2. If Frontend/React/UI, ask for an interactive UI component (autocomplete, accordion, carousel, custom hook, modal, or single-page widget in HTML+CSS+JS).
3. If Backend/Fullstack, ask for a real-world system utility (rate limiter, LRU cache, async pool, event emitter, tree parser).
4. If AI/ML/Data, ask for a data processing pipeline, metric calculation (cosine similarity, TF-IDF), or vectorized model routine.
5. Provide starter code templates in JavaScript and Python.

You MUST respond with ONLY valid JSON adhering strictly to this schema:
{
  "problemId": "<unique-slug>",
  "title": "<Concise Problem Title>",
  "category": "${context.category || domain}",
  "difficulty": "${context.difficultyLevel === 'advanced' ? 'Hard' : (context.difficultyLevel === 'beginner' ? 'Easy' : 'Medium')}",
  "problemType": "${domain === 'frontend' ? 'frontend_component' : 'algorithm_function'}",
  "description": "<Clear problem statement with background context and requirements>",
  "requirements": ["<Requirement 1>", "<Requirement 2>", "<Requirement 3>"],
  "examples": [
    {
      "input": "<example input>",
      "output": "<example output>",
      "explanation": "<brief explanation>"
    }
  ],
  "constraints": ["<Constraint 1>", "<Constraint 2>"],
  "starterCode": {
    "javascript": "<starter js template with comments and test cases>",
    "python": "<starter python template with test cases>",
    "html": "<starter html/css/js template if frontend>"
  }
}`;

    const llmResponse = await generateWithFallback(prompt, context);
    const cleaned = llmResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.title && parsed.description) {
        console.log(`✨ Generated custom AI coding challenge: "${parsed.title}" for ${context.targetRole}`);
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Dynamic coding challenge generation fallback to curated:", err.message);
  }

  // Fallback to curated challenge
  const domainList = CURATED_PROBLEMS[domain] || CURATED_PROBLEMS["backend"];
  const selected = domainList[Math.floor(Math.random() * domainList.length)];
  console.log(`📋 Selected curated coding challenge: "${selected.title}" (${domain})`);
  return selected;
}
