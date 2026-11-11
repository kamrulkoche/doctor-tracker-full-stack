import { test as base } from "@playwright/test";

import { API_URL } from "./helpers";

const MIN_REMAINING = 90;

/**
 * The API allows 300 requests per minute per IP. Three viewport projects against a fast
 * production build can exceed that, so before every test this fixture reads the standard
 * `RateLimit` response header and, when the remaining budget is low, waits for the window
 * to reset. It never changes what the tests do, only when they start.
 */
export const test = base.extend<{ rateLimitBudget: void }>({
  rateLimitBudget: [
    async ({ request }, use) => {
      try {
        const response = await request.get(`${API_URL}/health`);
        const header = response.headers()["ratelimit"] ?? "";
        const remaining = Number(/remaining=(\d+)/.exec(header)?.[1] ?? Number.NaN);
        const reset = Number(/reset=(\d+)/.exec(header)?.[1] ?? Number.NaN);
        if (Number.isFinite(remaining) && remaining < MIN_REMAINING && Number.isFinite(reset)) {
          await new Promise((resolve) => setTimeout(resolve, (reset + 1) * 1000));
        }
      } catch {
        // If the API is unreachable the test itself will report it.
      }
      await use();
    },
    { auto: true, timeout: 90_000 },
  ],
});

export { expect } from "@playwright/test";
