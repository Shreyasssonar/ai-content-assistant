/**
 * src/server.js
 *
 * Process entry point.
 * Imports the Express app and binds it to a TCP port.
 * Kept intentionally thin so tests can import app.js directly
 * without opening a real network socket.
 */

import { env } from './config/env.js';
import app from './app.js';

app.listen(env.port, () => {
  console.log(`✅ Server running on http://localhost:${env.port}`);
  console.log(`   Gemini model : ${env.geminiModel}`);
  console.log(`   Frontend URL : ${env.frontendUrl}`);
});
