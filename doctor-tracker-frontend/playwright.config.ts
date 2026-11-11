import { defineConfig } from "@playwright/test";

/**
 * End-to-end suite. It expects the app (default http://localhost:3000) and the API to be
 * running already; nothing is started from here.
 *
 *   E2E_BASE_URL          app origin            (default http://localhost:3000)
 *   E2E_API_URL           API base incl. /api   (default http://localhost:5000/api)
 *   E2E_ADMIN_EMAIL       demo admin            (default admin@doctortracker.dev)
 *   E2E_ADMIN_PASSWORD    demo admin password   (default Admin@12345)
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export const STORAGE_STATE = "e2e/.auth/admin.json";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  // Tests create and delete their own uniquely named records, so files can run in parallel,
  // but a single worker keeps the shared demo database and the login rate limit predictable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { viewport: { width: 1440, height: 900 }, storageState: STORAGE_STATE },
    },
    {
      name: "tablet",
      dependencies: ["setup"],
      use: { viewport: { width: 820, height: 1180 }, hasTouch: true, storageState: STORAGE_STATE },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
        storageState: STORAGE_STATE,
      },
    },
  ],
});
