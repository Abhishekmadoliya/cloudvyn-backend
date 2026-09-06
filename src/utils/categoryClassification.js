// ─────────────────────────────────────────────────────────────────────────────
// categoryClassification.js
// Single source of truth for categorizing domains into coding-required vs non-coding.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Domains / categories where interactive live coding challenges are relevant.
 */
export const CODING_CATEGORIES = new Set([
  // Core Engineering & Algorithms
  "dsa",
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "system_design",
  
  // AI, Data & Infrastructure
  "datascience",
  "genai_llm",
  "data_engineering",
  "database_sql",
  "devops",
  "cloud_architect",
  "cybersecurity",
  "qa",

  // Specialized Engineering
  "embedded_iot",
  "game_dev",
  "blockchain",
]);

/**
 * Domains / categories where interviews are purely conversational / case-study / scenario based (NO coding).
 */
export const NON_CODING_CATEGORIES = new Set([
  "data_analyst",
  "ui_ux_design",
  "management",
  "agile_scrum",
  "business_analyst",
  "hr_recruitment",
  "marketing_growth",
  "fintech",
  "sales_bd",
  "customer_success",
  "it_support",
  "operations",
  "legal_compliance",
  "consulting",
  "other",
]);

/**
 * Checks if a given category or role string requires practical coding challenges.
 * @param {string} category - Category ID or string
 * @param {string} [targetRole] - Optional target role name for secondary fallback
 * @returns {boolean}
 */
export function isCodingCategory(category, targetRole = "") {
  if (!category && !targetRole) return false;
  
  const cat = (category || "").toLowerCase().trim();
  if (CODING_CATEGORIES.has(cat)) return true;
  if (NON_CODING_CATEGORIES.has(cat)) return false;

  // Fallback heuristic for custom / unstructured categories or roles
  const roleText = `${cat} ${(targetRole || "").toLowerCase()}`;
  
  const nonCodingKeywords = [
    "hr", "recruiter", "talent", "marketing", "growth", "product manager", "pm",
    "scrum", "agile", "business analyst", "sales", "ui/ux", "designer", "finance",
    "consultant", "operations", "supply chain", "legal", "compliance", "customer success"
  ];

  // If matches explicit non-coding keywords first, reject coding
  if (nonCodingKeywords.some(k => roleText.includes(k))) {
    return false;
  }

  const codingKeywords = [
    "dsa", "algorithm", "developer", "engineer", "frontend", "backend", "fullstack",
    "full-stack", "software", "programmer", "coding", "react", "node", "python", "java",
    "c++", "c#", "golang", "rust", "devops", "sre", "sdet", "firmware", "smart contract",
    "solidity", "llm", "deep learning", "machine learning", "database administrator", "dba"
  ];

  // If matches coding keywords
  return codingKeywords.some(k => roleText.includes(k));
}
