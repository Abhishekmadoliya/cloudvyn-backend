/**
 * Blog Queue — DISABLED
 *
 * BullMQ queue is not used. The pipeline runs in-process via
 * src/services/blog/pipelineOrchestrator.js
 *
 * This file is kept as a stub so existing imports don't break.
 */

export async function addBlogJob(stage, payload) {
  console.log(`[Queue:stub] addBlogJob called for stage "${stage}" — running in-process, no queue needed.`);
  return { id: `stub-${Date.now()}` };
}

export async function getQueueMetrics() {
  return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
}

export default null;
