import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Every test file shares one Dockerized `*_test` database, so files run one at a time.
    fileParallelism: false,
    env: { NODE_ENV: 'test' },
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
