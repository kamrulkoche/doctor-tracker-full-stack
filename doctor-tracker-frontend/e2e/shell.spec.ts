import { expect, test } from "./fixtures";

import { ApiHelper, expectNoHorizontalOverflow, trackConsoleErrors } from "./helpers";

const MAIN_PAGES = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/doctors", heading: "Doctors" },
  { path: "/patients", heading: "Patients" },
  { path: "/settings", heading: "Settings" },
] as const;

test.describe("app shell", () => {
  for (const { path, heading } of MAIN_PAGES) {
    test(`${path} renders without console errors or horizontal overflow`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("[aria-busy='true']").filter({ visible: true })).toHaveCount(0);

      await expectNoHorizontalOverflow(page);
      expect(errors, `console errors on ${path}`).toEqual([]);
      await expect(page).toHaveTitle(new RegExp(`^${heading} · Doctor Tracker$`));
    });
  }

  test("detail pages render without console errors or horizontal overflow", async ({ page }) => {
    const api = new ApiHelper(page.request);
    const { data: doctors } = await api.get<{ id: string; name: string }[]>("/doctors?limit=1");
    const { data: patients } = await api.get<{ id: string; name: string }[]>("/patients?limit=1");
    test.skip(doctors.length === 0 || patients.length === 0, "needs seeded data");
    const errors = trackConsoleErrors(page);

    for (const target of [
      { path: `/doctors/${doctors[0]?.id}`, name: doctors[0]?.name ?? "" },
      { path: `/patients/${patients[0]?.id}`, name: patients[0]?.name ?? "" },
    ]) {
      await page.goto(target.path);
      await expect(page.getByRole("heading", { level: 1, name: target.name })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalOverflow(page);
      // The breadcrumb shows the record's name, never the raw id.
      await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(target.name);
    }
    expect(errors).toEqual([]);
  });

  test("navigation works on every viewport (drawer on mobile, sidebar otherwise)", async ({
    page,
  }, testInfo) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    if (testInfo.project.name === "mobile") {
      // The sidebar is not on screen until the drawer is opened.
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
      await page.getByRole("button", { name: "Toggle Sidebar" }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer.getByRole("navigation", { name: "Main" })).toBeVisible();
      await expect(drawer.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
      await drawer.getByRole("link", { name: "Patients" }).click();
      // The drawer closes on navigation.
      await expect(page).toHaveURL(/\/patients$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } else {
      const nav = page.getByRole("navigation", { name: "Main" });
      await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
      await nav.getByRole("link", { name: "Patients" }).click();
      await expect(page).toHaveURL(/\/patients$/);
      await expect(nav.getByRole("link", { name: "Patients" })).toHaveAttribute("aria-current", "page");
    }
    await expect(page.getByRole("heading", { level: 1, name: "Patients" })).toBeVisible();
  });

  test("the sidebar collapse state persists across reloads", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "the mobile drawer has no persistent state");
    await page.goto("/doctors");
    const sidebar = page.locator("[data-slot='sidebar'][data-state]");
    const initial = await sidebar.getAttribute("data-state");
    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    const toggled = initial === "expanded" ? "collapsed" : "expanded";
    await expect(sidebar).toHaveAttribute("data-state", toggled);
    await page.reload();
    await expect(page.locator("[data-slot='sidebar'][data-state]")).toHaveAttribute("data-state", toggled);
  });

  test("the theme switcher applies and remembers dark mode", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.getByRole("button", { name: "Change theme" }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Change theme" }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("quick actions on the dashboard open the real forms", async ({ page }) => {
    await page.goto("/dashboard");
    const quickActions = page.getByRole("region", { name: "Quick actions" });
    await quickActions.getByRole("button", { name: "Add patient" }).click();
    const patientDialog = page.getByRole("dialog", { name: "Add patient" });
    await expect(patientDialog.getByRole("combobox", { name: "Assigned doctor" })).toBeEnabled();
    await patientDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(patientDialog).toBeHidden();

    await quickActions.getByRole("button", { name: "Add doctor" }).click();
    await expect(page.getByRole("dialog", { name: "Add doctor" })).toBeVisible();
  });

  test("the dashboard date range drives the charts and lives in the URL", async ({ page }) => {
    await page.goto("/dashboard");
    const growth = page.getByRole("region", { name: "Patient growth" });
    await expect(growth).toContainText("new patient");

    await page.getByRole("button", { name: "Date range" }).click();
    await page.getByRole("button", { name: "Last 30 days" }).click();
    await expect(page).toHaveURL(/[?&]range=30d/);
    await expect(page.getByRole("button", { name: "Date range" })).toContainText("Last 30 days");

    await growth.getByRole("radio", { name: "Week" }).click();
    await expect(page).toHaveURL(/[?&]interval=week/);
    await expect(growth.getByRole("radio", { name: "Week" })).toBeChecked();
  });

  test("an unknown route shows the 404 page inside the shell", async ({ page }) => {
    await page.goto("/settings/does-not-exist");
    await expect(page.getByText("Page not found").first()).toBeVisible();
  });
});
