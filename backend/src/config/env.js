/**
 * src/config/env.js
 *
 * Loads and validates required environment variables at startup.
 * The app will crash fast with a clear message if anything is missing,
 * rather than failing silently at runtime.
 */

import 'dotenv/config';

const required = ['GEMINI_API_KEY', 'DATABASE_URL'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        'Copy .env.example to .env and fill in the values.'
    );
  }
}

export const env = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
};
