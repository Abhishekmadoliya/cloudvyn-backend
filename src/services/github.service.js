import axios from "axios";

/**
 * Parses and sanitizes a GitHub URL or username string.
 * @param {string} input - e.g. "https://github.com/torvalds", "github.com/torvalds", "torvalds"
 * @returns {string|null} - Clean GitHub username
 */
export function extractGitHubUsername(input) {
  if (!input || typeof input !== "string") return null;

  let cleaned = input.trim();
  if (!cleaned) return null;

  // Remove trailing slashes and query strings
  cleaned = cleaned.replace(/\/+$/, "").split("?")[0];

  // Match full URLs or domain paths
  const urlMatch = cleaned.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // Remove leading @ if provided
  cleaned = cleaned.replace(/^@/, "");

  // Validate GitHub username pattern (alphanumeric and single hyphens, 1-39 chars)
  if (/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Fetches public GitHub profile details and top repositories sorted by stars/popularity.
 * @param {string} githubUrlOrUsername
 * @returns {Promise<object|null>}
 */
export async function fetchGitHubCandidateData(githubUrlOrUsername) {
  const username = extractGitHubUsername(githubUrlOrUsername);
  if (!username) {
    console.log("ℹ️ No valid GitHub username found in input:", githubUrlOrUsername);
    return null;
  }

  const headers = {
    "User-Agent": "CloudVyn-AI-Interview-Platform",
    Accept: "application/vnd.github.v3+json",
  };

  // If a GitHub token is configured in environment, use it to avoid rate limits
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    console.log(`🔍 Fetching GitHub data for user: ${username}...`);

    // Fetch user profile and repositories in parallel with 5s timeout
    const [userRes, reposRes] = await Promise.allSettled([
      axios.get(`https://api.github.com/users/${username}`, {
        headers,
        timeout: 5000,
      }),
      axios.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, {
        headers,
        timeout: 5000,
      }),
    ]);

    let profile = null;
    if (userRes.status === "fulfilled" && userRes.value?.data) {
      const u = userRes.value.data;
      profile = {
        username: u.login,
        name: u.name || u.login,
        bio: u.bio || "",
        company: u.company || "",
        location: u.location || "",
        publicReposCount: u.public_repos || 0,
        followers: u.followers || 0,
        avatarUrl: u.avatar_url || "",
        profileUrl: u.html_url || `https://github.com/${username}`,
      };
    }

    let topRepos = [];
    if (reposRes.status === "fulfilled" && Array.isArray(reposRes.value?.data)) {
      const rawRepos = reposRes.value.data;

      // Filter out forks first if we have non-fork repositories
      const nonForkRepos = rawRepos.filter((r) => !r.fork);
      const candidateRepos = nonForkRepos.length > 0 ? nonForkRepos : rawRepos;

      // Sort by stars descending, then forks descending
      const sorted = candidateRepos.sort((a, b) => {
        const starDiff = (b.stargazers_count || 0) - (a.stargazers_count || 0);
        if (starDiff !== 0) return starDiff;
        return (b.forks_count || 0) - (a.forks_count || 0);
      });

      // Take top 6 repositories
      topRepos = sorted.slice(0, 6).map((r) => ({
        name: r.name,
        description: r.description || "",
        language: r.language || "Unknown",
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        topics: Array.isArray(r.topics) ? r.topics.slice(0, 5) : [],
        url: r.html_url,
        isFork: Boolean(r.fork),
      }));
    }

    if (!profile && topRepos.length === 0) {
      console.warn(`⚠️ GitHub fetch returned no profile or repos for ${username}`);
      return null;
    }

    const result = {
      username: profile?.username || username,
      name: profile?.name || username,
      bio: profile?.bio || "",
      publicReposCount: profile?.publicReposCount || topRepos.length,
      followers: profile?.followers || 0,
      profileUrl: profile?.profileUrl || `https://github.com/${username}`,
      topRepos,
    };

    console.log(`✅ Successfully fetched GitHub profile and ${topRepos.length} top repos for ${username}`);
    return result;
  } catch (error) {
    console.error(`❌ Error fetching GitHub data for ${username}:`, error.message);
    return null;
  }
}
