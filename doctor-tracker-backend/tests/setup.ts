import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { env } from '../src/config/environment';
import { clearDatabase, ensureIndexes } from './helpers/db';

/*
 * Runs once per test file. Tests talk to the Dockerized MongoDB through MONGODB_URI_TEST.
 * Two independent guards make it impossible to wipe a real database:
 *   1. the environment loader refuses NODE_ENV=test unless that URI's database ends in `_test`;
 *   2. after connecting, the name reported by the server itself is checked again.
 */
beforeAll(async () => {
  if (!env.isTest) {
    throw new Error('Tests must run with NODE_ENV=test (use `npm test`).');
  }

  await connectDatabase();

  const databaseName = mongoose.connection.name;
  if (!databaseName.endsWith('_test')) {
    await disconnectDatabase();
    throw new Error(`Refusing to run tests against "${databaseName}": the database name must end with "_test".`);
  }

  await ensureIndexes();
  await clearDatabase();
});

afterAll(async () => {
  await clearDatabase();
  await disconnectDatabase();
});
