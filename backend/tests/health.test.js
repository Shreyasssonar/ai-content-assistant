/**
 * tests/health.test.js
 *
 * Smoke tests for the Express app.
 * Verifies the server starts and the health endpoint responds correctly.
 * Does NOT hit the database or the Gemini API.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /health', () => {
  it('returns 200 and { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/entries — unknown route guard', () => {
  it('returns 404 for a completely unknown path', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Route not found');
  });
});
