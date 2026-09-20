/**
 * src/services/gemini.service.js
 *
 * Gemini AI service — generates a structured summary + 3 tags for a given text.
 *
 * Design principles:
 *  - Uses @google/genai v1.x SDK (GoogleGenAI, Type)
 *  - Requests structured JSON output via responseSchema so Gemini is
 *    constrained at the model level, not just by prompt instructions
 *  - Validates the response a second time with Zod — never blindly trusts AI
 *  - Isolates all AI concerns; controllers see only clean results or GeminiError
 *  - Never exposes raw API errors or stack traces to callers
 */

import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env.js';

// ── Error class ────────────────────────────────────────────────────────────────

/**
 * Thrown by generateSummaryAndTags() for any AI-layer failure.
 * Controllers catch this and convert it to an appropriate HTTP response.
 *
 * `code` values:
 *   'TIMEOUT'          — Gemini did not respond within GEMINI_TIMEOUT_MS
 *   'API_ERROR'        — Network or upstream API failure
 *   'INVALID_RESPONSE' — Gemini returned unparseable or schema-invalid JSON
 */
export class GeminiError extends Error {
  /**
   * @param {'TIMEOUT'|'API_ERROR'|'INVALID_RESPONSE'} code
   * @param {string} message  Human-readable description (safe to log, not for frontend)
   * @param {unknown} [cause] Original error for server-side logging only
   */
  constructor(code, message, cause) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** Maximum ms to wait for a Gemini response before aborting. */
const GEMINI_TIMEOUT_MS = 20_000;

// ── Singleton AI client ────────────────────────────────────────────────────────

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

// ── Response schema (used by Gemini at the model level) ───────────────────────

/**
 * JSON schema sent to Gemini via responseSchema.
 * Constrains the model to return exactly the shape we expect.
 * minItems/maxItems enforce exactly 3 tags at the model level.
 */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'A concise, one-to-two sentence summary of the supplied text.',
      nullable: false,
    },
    tags: {
      type: Type.ARRAY,
      description: 'Exactly three short, relevant tags for the supplied text.',
      items: { type: Type.STRING },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ['summary', 'tags'],
};

// ── Zod post-response validation ───────────────────────────────────────────────

/**
 * Second line of defence: validate the parsed JSON even after Gemini's
 * structured-output guarantee.  Catches edge cases where the model
 * returns an empty string, fewer tags, duplicate tags, etc.
 */
const GeminiResponseSchema = z.object({
  summary: z.string().trim().min(1, 'Gemini returned an empty summary'),
  tags: z
    .array(z.string().trim().min(1, 'Tag must not be empty'))
    .length(3, 'Gemini must return exactly 3 tags'),
});

// ── Prompt builder ─────────────────────────────────────────────────────────────

/**
 * Builds the prompt sent to Gemini.
 * Keeping it in a function makes it easy to test/adjust without touching
 * the service logic.
 *
 * @param {string} text - The user-submitted text to analyse
 * @returns {string}
 */
function buildPrompt(text) {
  return `You are a helpful assistant that analyses text and returns structured data.

Analyse the text below and respond with a JSON object that contains:
1. "summary"  — a concise one-to-two sentence summary. Do not invent facts.
2. "tags"     — exactly three short, meaningful tags relevant to the text.
                Tags must be plain words or short phrases (no hashtags, no punctuation).
                Each tag must be unique.

Text to analyse:
"""
${text}
"""

Return only the requested JSON. Do not include any explanation or markdown.`;
}

// ── Main exported function ─────────────────────────────────────────────────────

/**
 * Calls the Gemini API and returns a validated summary + tags object.
 *
 * @param {string} text - The user-submitted text (already trimmed and validated by Zod)
 * @returns {Promise<{ summary: string, tags: string[] }>}
 * @throws {GeminiError} on timeout, API failure, or invalid response
 */
export async function generateSummaryAndTags(text) {
  let rawText;

  // ── 1. Call Gemini API ───────────────────────────────────────────────────────
  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents: buildPrompt(text),
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    });

    rawText = response.text();
  } catch (err) {
    // AbortSignal timeout fires a DOMException with name 'TimeoutError'
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new GeminiError(
        'TIMEOUT',
        `Gemini did not respond within ${GEMINI_TIMEOUT_MS / 1000}s`,
        err
      );
    }
    // Any other network/API error
    throw new GeminiError('API_ERROR', 'Gemini API request failed', err);
  }

  // ── 2. Parse JSON ────────────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new GeminiError(
      'INVALID_RESPONSE',
      'Gemini returned non-JSON content',
      err
    );
  }

  // ── 3. Validate with Zod ─────────────────────────────────────────────────────
  const result = GeminiResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new GeminiError(
      'INVALID_RESPONSE',
      `Gemini response failed validation: ${result.error.errors.map((e) => e.message).join(', ')}`,
      result.error
    );
  }

  const { summary, tags: rawTags } = result.data;

  // ── 4. Normalise tags ────────────────────────────────────────────────────────
  // Trim each tag (Zod already trims, but be explicit) and deduplicate.
  const tags = [...new Set(rawTags.map((t) => t.trim().toLowerCase()))];

  // After deduplication we must still have exactly 3 tags.
  if (tags.length !== 3) {
    throw new GeminiError(
      'INVALID_RESPONSE',
      `Expected exactly 3 unique tags after deduplication, got ${tags.length}`
    );
  }

  return { summary: summary.trim(), tags };
}
