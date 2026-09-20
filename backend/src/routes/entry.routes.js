/**
 * src/routes/entry.routes.js
 *
 * Express router for the /api/entries resource.
 *
 * Middleware chain for POST:
 *   validate(CreateEntrySchema)  ← Zod: rejects malformed requests with 400
 *         ↓
 *   entryController.create       ← calls Gemini → saves to DB → returns 201
 *
 * GET routes pass straight to the controller (no request body to validate).
 */

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { CreateEntrySchema } from '../schemas/entrySchemas.js';
import { create, list, getById } from '../controllers/entry.controller.js';

export const router = Router();

/**
 * POST /api/entries
 *
 * Body: { text: string }  — required, non-empty, max 10 000 chars
 *
 * Success: 201 { id, originalText, summary, tags[], createdAt }
 * Errors:
 *   400 — validation failure (missing/empty/too-long text)
 *   502 — Gemini returned an invalid response
 *   504 — Gemini timed out
 *   500 — unexpected server error
 */
router.post('/', validate(CreateEntrySchema), create);

/**
 * GET /api/entries
 *
 * Returns all entries ordered by createdAt descending.
 * Success: 200 [{ id, originalText, summary, tags[], createdAt }, ...]
 */
router.get('/', list);

/**
 * GET /api/entries/:id
 *
 * Returns the entry with the given numeric id.
 * Success: 200 { id, originalText, summary, tags[], createdAt }
 * Errors:
 *   400 — id is not a number
 *   404 — entry not found
 */
router.get('/:id', getById);
