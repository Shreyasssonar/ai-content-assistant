/**
 * src/controllers/entry.controller.js
 *
 * Handlers for the /api/entries resource.
 *
 * Responsibilities of this file:
 *   - Read validated input from req.body / req.params
 *   - Delegate business logic to service layer
 *   - Map service/AI errors to clean HTTP responses
 *   - Never expose internal details (keys, stack traces, raw API errors)
 *
 * What this file does NOT do:
 *   - Validation (done by Zod middleware before the handler runs)
 *   - AI calls (done by gemini.service.js)
 *   - Database access (done by entries.service.js)
 */

import { AppError } from '../middleware/error.middleware.js';
import { GeminiError, generateSummaryAndTags } from '../services/gemini.service.js';
import { createEntry, getAllEntries, getEntryById } from '../services/entries.js';

// ── POST /api/entries ──────────────────────────────────────────────────────────

/**
 * Full flow:
 *  1. Read `text` from validated req.body  (Zod has already trimmed it)
 *  2. Send to Gemini service → { summary, tags }
 *  3. Validate AI output once more at the application boundary (done inside service)
 *  4. Persist to SQLite via entries service
 *  5. Return the saved record (tags are always a string array)
 *
 * An entry is NEVER written to the DB if any preceding step fails.
 *
 * @type {import('express').RequestHandler}
 */
export async function create(req, res, next) {
  try {
    // Step 1 — read text.
    // `text` is the public API field name; `originalText` is the DB column.
    // Zod middleware has already confirmed it is a non-empty trimmed string.
    const originalText = req.body.text;

    // Step 2 + 3 — call Gemini, get validated { summary, tags }.
    // gemini.service.js owns all AI logic and throws GeminiError on failure.
    // If this throws, we jump to the catch block and nothing is saved.
    const { summary, tags } = await generateSummaryAndTags(originalText);

    // Step 4 — persist to SQLite.
    // createEntry serialises tags → JSON string internally; the returned
    // object always has tags as a string array (formatEntry handles this).
    const entry = await createEntry({ originalText, summary, tags });

    // Step 5 — return 201 with the full saved entry.
    res.status(201).json(entry);
  } catch (err) {
    // Map GeminiError codes to safe, user-facing HTTP responses.
    // Raw Gemini errors, API keys, and stack traces must never reach the client.
    if (err instanceof GeminiError) {
      switch (err.code) {
        case 'TIMEOUT':
          return next(
            new AppError(504, 'The AI service timed out. Please try again.')
          );
        case 'API_ERROR':
          return next(
            new AppError(502, 'The AI service is unavailable. Please try again later.')
          );
        case 'INVALID_RESPONSE':
          return next(
            new AppError(
              502,
              'The AI service returned an unexpected response. Please try again.'
            )
          );
        default:
          return next(new AppError(502, 'An unexpected AI error occurred.'));
      }
    }

    // Pass everything else (DB errors, unexpected) to the global error handler.
    next(err);
  }
}

// ── GET /api/entries ───────────────────────────────────────────────────────────

/**
 * Returns all entries ordered by createdAt descending.
 *
 * @type {import('express').RequestHandler}
 */
export async function list(_req, res, next) {
  try {
    const entries = await getAllEntries();
    res.json(entries);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/entries/:id ───────────────────────────────────────────────────────

/**
 * Returns a single entry by numeric id.
 * 400 if :id is not a valid integer.
 * 404 if no entry exists with that id.
 *
 * @type {import('express').RequestHandler}
 */
export async function getById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Entry id must be a number');
    }

    const entry = await getEntryById(id);
    if (!entry) {
      throw new AppError(404, 'Entry not found');
    }

    res.json(entry);
  } catch (err) {
    next(err);
  }
}
