/**
 * topicRoutes.js
 *
 *   GET /api/topic              — trending topics
 *   GET /api/topic/:slug/posts  — posts by topic
 */
import express from 'express';
import { getTrendingTopics, getTopicPosts } from '../controllers/topicController.js';

const topicRouter = express.Router();

topicRouter.get('/', getTrendingTopics);
topicRouter.get('/:slug/posts', getTopicPosts);

export default topicRouter;
