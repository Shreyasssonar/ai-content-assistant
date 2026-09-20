/**
 * tests/validation.test.js
 *
 * Tests for POST /api/entries request validation.
 *
 * These tests confirm that malformed requests are rejected by the Zod
 * middleware BEFORE they can reach the AI service layer.
 *
 * Error response shape (all errors):
 *   { "error": { "message": "..." } }
 *
 * Validation errors additionally include:
 *   { "error": { "message": "Validation error", "details": [{ "field", "message" }] } }
 *
 * Run: npm test
 */

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import * as geminiService from '../src/services/gemini.service.js';

// Mock the Gemini service so automated tests never hit the real API
vi.mock('../src/services/gemini.service.js', () => ({
  generateSummaryAndTags: vi.fn(),
  GeminiError: class extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'GeminiError';
      this.code = code;
    }
  },
}));

const POST = (body) =>
  request(app).post('/api/entries').send(body).set('Content-Type', 'application/json');

describe('POST /api/entries — validation', () => {
  it('returns 400 when body is empty', async () => {
    const res = await POST({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
    expect(res.body.error.details).toBeInstanceOf(Array);
    expect(res.body.error.details[0].field).toBe('text');
  });

  it('returns 400 when text is missing', async () => {
    const res = await POST({ other: 'field' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });

  it('returns 400 when text is an empty string', async () => {
    const res = await POST({ text: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toMatch(/empty|whitespace/i);
  });

  it('returns 400 when text is whitespace-only', async () => {
    const res = await POST({ text: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toMatch(/empty|whitespace/i);
  });

  it('returns 400 when text is not a string', async () => {
    const res = await POST({ text: 12345 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });

  it('returns 400 when text exceeds 10 000 characters', async () => {
    const res = await POST({ text: 'a'.repeat(10_001) });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toMatch(/10.000|10000/i);
  });

  it('does not expose stack traces in error responses', async () => {
    const res = await POST({});
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at Object\.|\.js:\d+/);
  });

  it('response always uses the { error: { message } } envelope', async () => {
    const res = await POST({});
    expect(res.status).toBe(400);
    // Top-level must have exactly one key: 'error'
    expect(Object.keys(res.body)).toEqual(['error']);
    // 'error' must be an object with at least a 'message' key
    expect(typeof res.body.error).toBe('object');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('passes validation and reaches the service layer with valid text', async () => {
    // Mock a successful AI response
    vi.mocked(geminiService.generateSummaryAndTags).mockResolvedValueOnce({
      summary: 'Mocked summary',
      tags: ['mock', 'test', 'data'],
    });

    const res = await POST({ text: 'This is a valid piece of text.' });
    
    // We expect 201 Created since it passes validation and the mock succeeds
    expect(res.status).toBe(201);
    expect(res.body.summary).toBe('Mocked summary');
    expect(res.body.tags).toEqual(['mock', 'test', 'data']);
    expect(geminiService.generateSummaryAndTags).toHaveBeenCalledWith('This is a valid piece of text.');
  });
});
