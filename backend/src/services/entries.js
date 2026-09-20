/**
 * src/services/entries.js
 *
 * Data-access service for Entry records.
 * All Prisma calls go through here so controllers stay thin and
 * the database layer can be tested/mocked in isolation.
 */

import prisma from '../config/prisma.js';
import { formatEntry, formatEntries } from '../utils/formatEntry.js';

/**
 * Persist a new Entry to the database.
 *
 * @param {object} params
 * @param {string} params.originalText
 * @param {string} params.summary
 * @param {string[]} params.tags  - Must contain exactly 3 items
 * @returns {Promise<object>} Formatted entry with tags as array
 */
export async function createEntry({ originalText, summary, tags }) {
  const entry = await prisma.entry.create({
    data: {
      originalText,
      summary,
      tags: JSON.stringify(tags), // serialise array → JSON string for SQLite
    },
  });
  return formatEntry(entry);
}

/**
 * Return all entries, newest first.
 *
 * @returns {Promise<object[]>}
 */
export async function getAllEntries() {
  const entries = await prisma.entry.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return formatEntries(entries);
}

/**
 * Return a single entry by id, or null if not found.
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function getEntryById(id) {
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) return null;
  return formatEntry(entry);
}
