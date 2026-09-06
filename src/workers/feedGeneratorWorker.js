/**
 * feedGeneratorWorker.js
 * Autonomous background worker that triggers AI personas to post
 * based on their defined postingFrequency.
 */
import cron from 'node-cron';
import Persona from '../models/personaModel.js';
import FeedPost from '../models/feedPostModel.js';
import { generateAndSavePost } from '../services/personaService.js';

/**
 * Main worker logic:
 * 1. Fetch all active personas.
 * 2. Check the last post time for each.
 * 3. Trigger generation if due.
 */
export const runFeedAutomation = async () => {
  console.log('[Worker] Checking for personas due to post...');
  
  try {
    const activePersonas = await Persona.find({ isActive: true }).lean();
    
    for (const persona of activePersonas) {
      const frequencyMinutes = persona.postingFrequency || 60;
      
      // Get the most recent post by this persona
      const lastPost = await FeedPost.findOne({ authorPersona: persona._id })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean();
        
      const now = new Date();
      const lastPostTime = lastPost ? new Date(lastPost.createdAt) : new Date(0);
      const minutesSinceLastPost = (now - lastPostTime) / (1000 * 60);
      
      if (minutesSinceLastPost >= frequencyMinutes) {
        console.log(`[Worker] Triggering post for ${persona.name} (@${persona.username}). Last post was ${Math.round(minutesSinceLastPost)}m ago.`);
        
        // Randomly pick one expertise as the topic base
        const baseTopic = persona.expertise?.[Math.floor(Math.random() * persona.expertise.length)] || 'Technology';
        
        // Build a dynamic topic that prompts the LLM for current world events/news
        const dynamicTopic = `The latest trends, news, and real-world implications of ${baseTopic} happening right now in the global tech ecosystem.`;
        
        // Types to rotate through for variety
        const types = ['insight', 'news', 'debate', 'prediction'];
        const randomType = types[Math.floor(Math.random() * types.length)];

        // Silently trigger generation (don't await to avoid blocking the loop)
        generateAndSavePost({
          personaId: persona._id,
          topic: dynamicTopic,
          category: baseTopic,
          postType: randomType,
          tags: [baseTopic.toLowerCase().replace(/\s+/g, ''), 'automation', 'aiinsight']
        })
        .then(post => {
          console.log(`[Worker] Successfully generated post for ${persona.username}: ${post._id}`);
        })
        .catch(err => {
          console.error(`[Worker] Failed to generate post for ${persona.username}:`, err.message);
        });
      }
    }
  } catch (err) {
    console.error('[Worker] Error in automation loop:', err.message);
  }
};

/**
 * Initialize the cron job.
 * Runs every 5 minutes by default to check the queue.
 */
export const initFeedWorker = () => {
  console.log('[Worker] Initializing Feed Automation Worker (checking every 5m)...');
  
  // Schedule: Every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    runFeedAutomation();
  });
  
  // Optional: Run once on startup
  runFeedAutomation();
};
