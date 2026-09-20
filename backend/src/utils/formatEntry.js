/**
 * src/utils/formatEntry.js
 *
 * Transforms a raw Prisma Entry record into the API response shape.
 *
 * SQLite has no native array type, so tags are stored as a JSON string.
 * This utility parses that string back to an array so every API response
 * consistently returns tags as string[].
 *
 * @param {object} entry - Raw Entry record from Prisma
 * @returns {object} - Entry with tags as a parsed array
 */
export function formatEntry(entry) {
  return {
    id: entry.id,
    originalText: entry.originalText,
    summary: entry.summary,
    tags: JSON.parse(entry.tags), // stored as '["a","b","c"]', returned as ["a","b","c"]
    createdAt: entry.createdAt,
  };
}

/**
 * Convenience wrapper for formatting an array of entries.
 * @param {object[]} entries
 * @returns {object[]}
 */
export function formatEntries(entries) {
  return entries.map(formatEntry);
}
