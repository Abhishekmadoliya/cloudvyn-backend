/**
 * personaService.js
 * Manages AI persona operations and LLM post generation.
 * LLM integration is pluggable — drop in any LLM SDK (OpenAI, Gemini, etc.).
 */
import Persona from '../models/personaModel.js';
import FeedPost from '../models/feedPostModel.js';
import { generateSlug } from '../utils/slugify.js';

/**
 * Get all active personas.
 */
export const getAllPersonas = async () => {
  return Persona.find({ isActive: true }).sort({ credibilityScore: -1 }).lean();
};

/**
 * Get persona by ID with recent posts.
 */
export const getPersonaWithPosts = async (personaId, limit = 10) => {
  const [persona, posts] = await Promise.all([
    Persona.findById(personaId).lean(),
    FeedPost.find({ authorPersona: personaId, status: 'published' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);
  return { persona, posts };
};

/**
 * Build a system prompt for LLM content generation.
 * @param {object} persona - Persona document
 * @param {string} topic - Topic to post about
 * @param {string} postType - 'insight' | 'tutorial' | 'news' | 'debate' | 'prediction'
 */
export const buildLLMPrompt = (persona, topic, postType = 'insight') => {
  const typeInstructions = {
    insight: 'Share a thought-provoking insight or analysis.',
    tutorial: 'Write a concise micro-tutorial with practical steps.',
    news: 'Summarize the latest development with context and implications.',
    debate: 'Take a strong stance on a controversial tech topic and argue your position.',
    prediction: 'Make a bold, reasoned prediction about the future of this topic.',
  };

  return `You are ${persona.name}, an AI persona with expertise in ${persona.expertise?.join(', ')}.
Your distinct writing personality and tone MUST be: ${persona.tone}.

### ESSENTIAL PERSONA INSTRUCTIONS
CRITICAL: You must strictly adhere to the following unique system prompt that defines your identity, beliefs, and exact communication style. If this conflicts with general advice, your system prompt wins:
"""
${persona.systemPrompt || 'Write as an experienced professional sharing insights.'}
"""

### POSTING STYLE & FORMAT (LinkedIn / X format)
- Write like a real human thought-leader on LinkedIn or X (Twitter).
- Be casual, highly conversational, and straight to the point. No fluff. No robotic intros ("As an AI...", "Here are X things...").
- Format for readability: Use a punchy headline followed by short paragraphs (1-3 sentences max) spaced out. 
- You can explain concepts concisely in paragraphs, but aim for a style similar to Grok on X: sharp, witty, direct, and insightful.
- Avoid generic conclusions and excessive emojis. Write like a real person sharing a raw, valuable thought.
- CRITICAL: Do NOT use markdown bolding (e.g., **text**). Use plain text or natural emphasis instead.
- STRUCTURE: Start with a strong headline that summarizes the main point. Then provide the body in 2-3 brief, insightful paragraphs.

### YOUR TASK
Task Type: ${typeInstructions[postType] || typeInstructions.insight}
Topic to cover: ${topic}

### STRICT LENGTH LIMITS
- Keep the entire post between 100–300 words. Keep it punchy.
- Do NOT use hashtags at the end.`;
};

/**
 * Generate a post via LLM and save it.
 * NOTE: Inject your LLM call here. This is a scaffold — replace the
 * placeholder content with an actual LLM API response.
 *
 * @param {string} personaId
 * @param {string} topic
 * @param {string} postType
 * @param {string[]} tags
 * @param {string} category
 */
export const generateAndSavePost = async ({
  personaId,
  topic,
  postType = 'insight',
  tags = [],
  category = 'AI',
  sourceRefs = [],
}) => {
  const persona = await Persona.findById(personaId);
  if (!persona) throw new Error('Persona not found');

  const systemPrompt = buildLLMPrompt(persona, topic, postType);

  // Import the Ollama utility dynamically or statically.
  // Since this is ESM and top-level imports are preferred, let's use dynamic import
  // to avoid circular dependencies or massive top-level loads just in case.
  const { generateFeedPostWithOllama } = await import('../utils/llm/ollama.js');
  
  const generatedResult = await generateFeedPostWithOllama(systemPrompt, persona.model);

  const post = await FeedPost.create({
    authorPersona: personaId,
    headline: generatedResult.headline,
    content: generatedResult.content,
    summary: generatedResult.summary,
    slug: generateSlug(generatedResult.headline),
    category,
    tags,
    topic,
    sourceRefs,
    credibilityScore: persona.credibilityScore,
    status: 'published',
  });

  return post;
};
