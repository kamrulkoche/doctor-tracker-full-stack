import type { Server } from 'node:http';
import { createApp } from './app';
import { connectDatabase, databaseName, disconnectDatabase } from './config/database';
import { env } from './config/environment';

const SHUTDOWN_TIMEOUT_MS = 10_000;

/** Logs a failure without ever printing a connection string (which contains credentials). */
function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
}

async function start(): Promise<void> {
  // Database first: the port is only opened once queries can actually be served.
  await connectDatabase();
  console.info(`[db] connected to MongoDB (database: ${databaseName()})`);

  const server: Server = createApp().listen(env.port, () => {
    console.info(`[server] listening on port ${env.port} (${env.nodeEnv})`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`[server] ${signal} received, shutting down`);

    // Safety net: never hang forever on a stuck keep-alive connection.
    const forceExit = setTimeout(() => {
      console.error('[server] shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    // Stop accepting connections, let in-flight requests finish, then close the pool.
    server.close(() => {
      disconnectDatabase()
        .then(() => {
          console.info('[server] shutdown complete');
          process.exit(0);
        })
        .catch((error: unknown) => {
          console.error(`[server] error while closing the database: ${describeError(error)}`);
          process.exit(1);
        });
    });
    server.closeIdleConnections();
  };

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
}

process.on('unhandledRejection', (reason) => {
  console.error(`[server] unhandled rejection: ${describeError(reason)}`);
  process.exit(1);
});

start().catch((error: unknown) => {
  console.error(`[server] failed to start: ${describeError(error)}`);
  process.exit(1);
});
