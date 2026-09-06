/**
 * Blog Workers — DISABLED
 *
 * BullMQ workers are not used. The pipeline runs in-process via
 * src/services/blog/pipelineOrchestrator.js (1 blog/day via cron).
 *
 * If you ever need to scale to many concurrent pipelines,
 * re-enable BullMQ by installing redis and restoring the individual workers.
 */
export function initBlogWorkers() {
  console.log("[BlogWorkers] In-process mode — BullMQ workers not used (Redis not required).");
}
