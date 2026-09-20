import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Load a test-specific .env so tests never need real credentials
    env: {
      GEMINI_API_KEY: 'test-key',
      DATABASE_URL: 'file:./test.db',
      GEMINI_MODEL: 'gemini-2.0-flash',
      PORT: '3001',
      FRONTEND_URL: 'http://localhost:5173',
    },
  },
});
