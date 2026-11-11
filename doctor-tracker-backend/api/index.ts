import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app';
import { connectDatabase, isDatabaseConnected } from '../src/config/database';

/**
 * Vercel serverless entry point. `vercel.json` rewrites every path here.
 *
 * `src/server.ts` is for long-running hosts (local dev, Render): it connects once and calls
 * `listen()`. A serverless function must not listen; instead the app and the Mongoose pool
 * live at module scope, so a warm instance reuses both across invocations.
 */
const app = createApp();

let pendingConnection: Promise<void> | null = null;

function ensureDatabase(): Promise<void> {
  if (isDatabaseConnected()) return Promise.resolve();
  // Concurrent cold-start requests share one connection attempt; a failure is not cached.
  pendingConnection ??= connectDatabase().catch((error: unknown) => {
    pendingConnection = null;
    throw error;
  });
  return pendingConnection;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await ensureDatabase();
  } catch (error) {
    // Never log the error object itself: a Mongo error can echo the connection string.
    console.error(`[db] connection failed: ${error instanceof Error ? error.name : 'Unknown error'}`);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Database is unavailable, try again shortly' },
      }),
    );
    return;
  }
  app(req, res);
}
