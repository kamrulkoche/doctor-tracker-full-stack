import mongoose from 'mongoose';
import { env } from './environment';

mongoose.set('strictQuery', true);

/**
 * Opens the single shared connection pool. The server calls this before it starts
 * listening, so no request is ever served without a database.
 */
export async function connectDatabase(uri: string = env.mongoUri): Promise<void> {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10,
    // Indexes are declared on the schemas and built on startup. With a large production
    // dataset this would be switched off in favour of an explicit migration step.
    autoIndex: true,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

export function databaseName(): string {
  return mongoose.connection.name;
}
