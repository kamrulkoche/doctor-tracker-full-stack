import { expect, test as setup } from "./fixtures";

import { STORAGE_STATE } from "../playwright.config";
import { ApiHelper, signIn } from "./helpers";

/** Signs in once through the real form and saves the session for the other projects. */
setup("authenticate as the demo admin", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  // Start from a clean slate if a previous run was interrupted before its clean-up.
  await new ApiHelper(page.request).purgeLeftovers();
  await page.context().storageState({ path: STORAGE_STATE });
});
