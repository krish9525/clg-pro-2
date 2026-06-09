/**
 * Generates a URL-safe slug from a string.
 * e.g. "React & Node.js — Full Course!" → "react-nodejs-full-course"
 */
export const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")   // remove special chars
    .replace(/[\s_]+/g, "-")         // spaces/underscores → hyphen
    .replace(/-{2,}/g, "-")          // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");        // trim leading/trailing hyphens

/**
 * Generate a unique slug by appending a short random suffix if needed.
 * @param {string} text - base text to slugify
 * @param {Function} checkExists - async (slug) => boolean — returns true if slug already taken
 */
export const uniqueSlug = async (text, checkExists) => {
  const base = slugify(text);
  if (!(await checkExists(base))) return base;

  // Append random 4-char hex suffix until unique
  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(16).slice(2, 6);
    const candidate = `${base}-${suffix}`;
    if (!(await checkExists(candidate))) return candidate;
  }
  // Fallback: timestamp suffix
  return `${base}-${Date.now()}`;
};
