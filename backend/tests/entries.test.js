/**
 * tests/entries.test.js
 *
 * Integration tests for GET /api/entries and GET /api/entries/:id.
 *
 * Uses a real in-process SQLite database (file:./test.db, as set in
 * vitest.config.js) and Prisma to seed + tear down fixtures.
 * This proves that data actually persists through the service layer —
 * no mocks, no static data.
 *
 * Run: npm test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Inserts a raw Entry row directly via Prisma (bypasses Gemini).
 * Tags are serialised to JSON string as the DB requires.
 */
async function seedEntry(overrides = {}) {
  return prisma.entry.create({
    data: {
      originalText: overrides.originalText ?? 'Default original text for testing.',
      summary: overrides.summary ?? 'A concise test summary.',
      tags: JSON.stringify(overrides.tags ?? ['alpha', 'beta', 'gamma']),
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Ensure the Prisma client is connected before any test runs.
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up all rows and disconnect cleanly.
  await prisma.entry.deleteMany();
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Wipe the table before each test so tests are fully independent.
  await prisma.entry.deleteMany();
});

// ── GET /api/entries ───────────────────────────────────────────────────────────

describe('GET /api/entries', () => {
  it('returns 200 and an empty array when no entries exist', async () => {
    const res = await request(app).get('/api/entries');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('returns seeded entries as a JSON array', async () => {
    await seedEntry({ originalText: 'First entry text.' });
    await seedEntry({ originalText: 'Second entry text.' });

    const res = await request(app).get('/api/entries');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns entries ordered newest first (descending createdAt)', async () => {
    // Seed with explicit timestamps to guarantee ordering regardless of
    // how fast the test runs.
    const older = new Date('2024-01-01T10:00:00Z');
    const newer = new Date('2024-01-02T10:00:00Z');

    await seedEntry({ originalText: 'Older entry.', createdAt: older });
    await seedEntry({ originalText: 'Newer entry.', createdAt: newer });

    const res = await request(app).get('/api/entries');

    expect(res.status).toBe(200);
    expect(res.body[0].originalText).toBe('Newer entry.');
    expect(res.body[1].originalText).toBe('Older entry.');
  });

  it('each entry has the required fields', async () => {
    await seedEntry();

    const res = await request(app).get('/api/entries');
    const entry = res.body[0];

    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('originalText');
    expect(entry).toHaveProperty('summary');
    expect(entry).toHaveProperty('tags');
    expect(entry).toHaveProperty('createdAt');
  });

  it('tags are returned as an array, not a JSON string', async () => {
    await seedEntry({ tags: ['finance', 'investing', 'ipo'] });

    const res = await request(app).get('/api/entries');
    const { tags } = res.body[0];

    expect(Array.isArray(tags)).toBe(true);
    expect(tags).toHaveLength(3);
    expect(tags).toEqual(['finance', 'investing', 'ipo']);
  });

  it('does not include unexpected database metadata fields', async () => {
    await seedEntry();

    const res = await request(app).get('/api/entries');
    const entry = res.body[0];
    const keys = Object.keys(entry);

    // Only these five fields should be present — no Prisma internals
    expect(keys.sort()).toEqual(['createdAt', 'id', 'originalText', 'summary', 'tags'].sort());
  });

  it('data survives a controller re-instantiation (simulating restart)', async () => {
    // Seed directly into SQLite.
    const seeded = await seedEntry({ originalText: 'Persistent entry.' });

    // Hit the API — if data was only in memory this would return empty.
    const res = await request(app).get('/api/entries');

    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(seeded.id);
    expect(res.body[0].originalText).toBe('Persistent entry.');
  });
});

// ── GET /api/entries/:id ───────────────────────────────────────────────────────

describe('GET /api/entries/:id', () => {
  it('returns 200 and the full entry for a valid id', async () => {
    const seeded = await seedEntry({
      originalText: 'The full original text.',
      summary: 'A neat summary.',
      tags: ['one', 'two', 'three'],
    });

    const res = await request(app).get(`/api/entries/${seeded.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seeded.id);
    expect(res.body.originalText).toBe('The full original text.');
    expect(res.body.summary).toBe('A neat summary.');
    expect(res.body.tags).toEqual(['one', 'two', 'three']);
    expect(res.body.createdAt).toBeDefined();
  });

  it('returns exactly 3 tags', async () => {
    const seeded = await seedEntry({ tags: ['x', 'y', 'z'] });

    const res = await request(app).get(`/api/entries/${seeded.id}`);

    expect(res.body.tags).toHaveLength(3);
  });

  it('includes originalText in the single-entry response', async () => {
    const seeded = await seedEntry({ originalText: 'Must be present in response.' });

    const res = await request(app).get(`/api/entries/${seeded.id}`);

    expect(res.body.originalText).toBe('Must be present in response.');
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app).get('/api/entries/999999');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Entry not found');
  });

  it('returns 400 when id is not a number', async () => {
    const res = await request(app).get('/api/entries/not-a-number');

    expect(res.status).toBe(400);
    expect(typeof res.body.error.message).toBe('string');
  });

  it('returns 400 for a floating-point id', async () => {
    // parseInt('3.7') = 3 which is valid — but '3.7abc' → NaN → 400
    const res = await request(app).get('/api/entries/abc123');

    expect(res.status).toBe(400);
  });

  it('does not return internal Prisma or DB metadata', async () => {
    const seeded = await seedEntry();

    const res = await request(app).get(`/api/entries/${seeded.id}`);
    const keys = Object.keys(res.body);

    expect(keys.sort()).toEqual(['createdAt', 'id', 'originalText', 'summary', 'tags'].sort());
  });
});
