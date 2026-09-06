/**
 * Utility to generate URL-safe slugs with a random suffix.
 * Example: "Best AI Tools 2026" -> "best-ai-tools-2026-123456"
 */
export const generateSlug = (text) => {
  if (!text) return Math.floor(100000 + Math.random() * 900000).toString();

  const baseSlug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-')     // Replace multiple - with single -
    .substring(0, 50);        // Limit length

  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `${baseSlug}-${suffix}`;
};
