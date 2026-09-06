/**
 * Redis Config — DISABLED
 *
 * Redis / BullMQ is not used in this setup.
 * The blog pipeline runs in-process (1 blog/day via node-cron).
 *
 * If you ever need to scale, set REDIS_URL in .env and
 * restore BullMQ workers in src/workers/blog/
 */
export default null;
