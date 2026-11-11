import { expect, test } from "./fixtures";

import { ADMIN_EMAIL, signIn } from "./helpers";

// These tests manage their own session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("authentication", () => {
  test("an unauthenticated visitor is redirected to the login page", async ({ page }) => {
    await page.goto("/patients?condition=Asthma");
    await expect(page).toHaveURL(/\/login\?next=/);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/patients?condition=Asthma");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });

  test("invalid credentials show an inline error and keep the user on the login page", async ({
    page,
  }, testInfo) => {
    // The API allows 10 failed logins per 15 minutes per IP; one viewport is enough for this check.
    test.skip(testInfo.project.name !== "desktop", "runs once to stay clear of the login rate limit");
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  test("client-side validation blocks an empty form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter your email address")).toBeVisible();
    await expect(page.getByText("Enter your password")).toBeVisible();
  });

  test("the password can be shown and hidden", async ({ page }) => {
    await page.goto("/login");
    const password = page.getByRole("textbox", { name: "Password" });
    await password.fill("secret");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("signing in opens the dashboard with real numbers in every widget", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    const stats = page.getByRole("region", { name: "Key statistics" });
    for (const label of [
      "Total doctors",
      "Total patients",
      "Total specializations",
      "New patients this month",
    ]) {
      const card = stats.getByTestId("stat-card").filter({ hasText: label });
      await expect(card.getByTestId("stat-value")).toHaveText(/^[0-9,]+$/);
    }

    for (const title of [
      "Patient growth",
      "Condition distribution",
      "Patients per doctor",
      "Doctors added over time",
      "Specialization distribution",
      "Top doctors by patients",
      "Quick actions",
      "Recent doctors",
      "Recent patients",
    ]) {
      await expect(page.getByRole("region", { name: title })).toBeVisible();
    }

    // Charts are lazy-loaded; each one must end up drawn (the demo data set is not empty).
    await expect(
      page.getByRole("region", { name: "Patient growth" }).locator("svg.recharts-surface"),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Patients per doctor" }).locator("svg.recharts-surface"),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Condition distribution" }).getByRole("list", { name: "Conditions" }),
    ).toContainText(/\d+ · \d/);
    await expect(
      page.getByRole("region", { name: "Recent patients" }).getByRole("listitem").first(),
    ).toBeVisible();
  });

  test("a deep link is restored after signing in", async ({ page }) => {
    await page.goto("/doctors?limit=20");
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page
      .getByRole("textbox", { name: "Password" })
      .fill(process.env.E2E_ADMIN_PASSWORD ?? "Admin@12345");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/doctors\?limit=20$/);
    await expect(page.getByRole("heading", { level: 1, name: "Doctors" })).toBeVisible();
  });

  test("logging out returns to the login page and locks the app again", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Account menu for/ }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
