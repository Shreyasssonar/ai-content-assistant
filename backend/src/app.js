/**
 * src/app.js
 *
 * Express application factory.
 * Registers middleware, mounts routes, and attaches the global error handler.
 *
 * Exported separately from server.js so it can be imported directly in tests
 * without starting a real TCP listener.
 */

import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { router as entriesRouter } from './routes/entry.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: env.frontendUrl,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

/** Health check — used by tests to verify the server is running */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/entries', entriesRouter);

// ── 404 handler — must come after all routes, before error middleware ──────────

app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

// ── Global error handler (must be last) ───────────────────────────────────────

app.use(errorMiddleware);

export default app;
