/**
 * src/schemas/entrySchemas.js
 *
 * Zod schemas for the /api/entries resource.
 *
 * Keeping schemas in their own file lets them be imported by both
 * the route layer and test files without pulling in Express or Prisma.
 */

import { z } from 'zod';

/**
 * Schema for POST /api/entries
 *
 * Rules:
 *  - `text` is required (missing key → clear message)
 *  - whitespace-only strings are rejected after trimming
 *  - maximum 10 000 characters (trimmed)
 */
export const CreateEntrySchema = z.object({
  text: z
    .string({ required_error: 'text is required' })
    .trim()
    .min(1, 'text must not be empty or whitespace-only')
    .max(10_000, 'text must be 10 000 characters or fewer'),
});
