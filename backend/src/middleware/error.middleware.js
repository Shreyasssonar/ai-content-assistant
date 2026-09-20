/**
 * src/middleware/error.middleware.js
 *
 * Centralised Express error-handling middleware.
 *
 * ALL errors thrown or passed to next() anywhere in the application flow
 * end up here.  This is the single place that decides what the client sees.
 *
 * Response envelope — always:
 *   {
 *     "error": {
 *       "message": "Human-readable message"
 *     }
 *   }
 *
 * Validation responses additionally include `details` inside the envelope:
 *   {
 *     "error": {
 *       "message": "Validation error",
 *       "details": [{ "field": "text", "message": "text is required" }]
 *     }
 *   }
 *
 * Rules:
 *   - NEVER send stack traces to the client
 *   - NEVER expose GEMINI_API_KEY or any credential
 *   - NEVER forward raw provider error messages
 *   - DO log unexpected errors server-side (safe in development)
 *
 * Error → HTTP status mapping:
 *   ZodError (validation)       → 400
 *   AppError (intentional)      → statusCode set by the thrower
 *     • 400  bad request / invalid id
 *     • 404  entry not found
 *     • 502  Gemini invalid/malformed response
 *     • 503  Gemini service unavailable (network failure)
 *     • 504  Gemini timeout
 *   GeminiError (bypass safety) → 502 (should not normally reach here)
 *   Everything else             → 500
 */

import { ZodError } from 'zod';
import { GeminiError } from '../services/gemini.service.js';

// ── AppError ───────────────────────────────────────────────────────────────────

/**
 * Intentional, known application error.
 *
 * Throw this from controllers or services to surface a specific HTTP status
 * and a safe, user-facing message without triggering the 500 catch-all.
 *
 * @example
 *   throw new AppError(404, 'Entry not found');
 *   throw new AppError(504, 'The AI service timed out. Please try again.');
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code to send
   * @param {string} message    - Safe, human-readable message for the client
   */
  constructor(statusCode, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Builds the standard error response envelope.
 * Callers may merge extra keys into the inner object (e.g. `details`).
 *
 * @param {string} message
 * @param {object} [extra]  - Additional keys merged into `error` object
 */
function errorResponse(message, extra = {}) {
  return { error: { message, ...extra } };
}

// ── Middleware ─────────────────────────────────────────────────────────────────

/**
 * Express 4-argument error handler.
 * Must be registered with app.use() AFTER all routes and regular middleware.
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export function errorMiddleware(err, _req, res, _next) {

  // ── 1. Zod validation failure → 400 ────────────────────────────────────────
  if (err instanceof ZodError) {
    return res.status(400).json(
      errorResponse('Validation error', {
        details: err.errors.map((e) => ({
          field: e.path.join('.') || 'unknown',
          message: e.message,
        })),
      })
    );
  }

  // ── 2. Known application error → statusCode set by thrower ─────────────────
  //
  //  Status codes used across the app:
  //    400 → invalid id format, bad request
  //    404 → entry not found
  //    502 → Gemini returned invalid/malformed response
  //    503 → Gemini network/service failure
  //    504 → Gemini timeout
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(errorResponse(err.message));
  }

  // ── 3. GeminiError that bypassed the controller ─────────────────────────────
  //
  // The controller should have already converted GeminiError → AppError.
  // This branch is a safety net for unexpected code paths.
  if (err instanceof GeminiError) {
    // Safe to log the code — never log the raw cause (may contain credentials).
    console.error(`[GeminiError] code=${err.code} message=${err.message}`);
    return res
      .status(502)
      .json(errorResponse('The AI service encountered an error. Please try again.'));
  }

  // ── 4. Unexpected / unhandled error → 500 ───────────────────────────────────
  //
  // Log the full error server-side for debugging.
  // Send only a generic message to the client — no stack, no internals.
  console.error('[Unhandled error]', err);
  return res.status(500).json(errorResponse('An unexpected error occurred. Please try again.'));
}
