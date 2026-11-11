// Captures real screenshots of the running app for the README ("Visual Evidence").
//
//   npm run screenshots
//
// Requires the app (E2E_BASE_URL, default http://localhost:3000) and the API to be running,
// with the demo data seeded. Nothing is mocked and no record is created or changed.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const BASE_URL = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const API_URL = (process.env.E2E_API_URL ?? "http://localhost:5000/api").replace(/\/+$/, "");
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@doctortracker.dev";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin@12345";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "docs", "screenshots");

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true },
];

/** Waits until skeletons are gone and lazy charts have drawn. */
async function settle(page) {
  await page.waitForLoadState("networkidle");
  try {
    // Next.js keeps previously visited routes in the DOM (hidden), so only visible regions count.
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("[aria-busy='true']")].every((element) => !element.checkVisibility()),
      null,
      { timeout: 20_000 },
    );
  } catch (error) {
    const busy = await page.evaluate(() =>
      [...document.querySelectorAll("[aria-busy='true']")].map((element) => element.outerHTML.slice(0, 160)),
    );
    console.error("Still loading:", busy);
    throw error;
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

async function capture(page, dir, name, options = {}) {
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: options.fullPage ?? true, animations: "disabled" });
  console.log(`  saved ${path.relative(ROOT, file)}`);
}

async function firstId(context, resource) {
  const response = await context.request.get(`${API_URL}/${resource}?limit=1&sortBy=name&sortOrder=asc`);
  if (!response.ok()) throw new Error(`GET /${resource} failed with ${response.status()}`);
  const body = await response.json();
  const id = body.data[0]?.id;
  if (!id)
    throw new Error(`No ${resource} found. Seed the demo data first (npm run seed:demo in the backend).`);
  return id;
}

async function run() {
  const browser = await chromium.launch();
  try {
    for (const target of VIEWPORTS) {
      console.log(`${target.name} (${target.viewport.width}x${target.viewport.height})`);
      const dir = path.join(OUT_DIR, target.name);
      await mkdir(dir, { recursive: true });

      const context = await browser.newContext({
        viewport: target.viewport,
        deviceScaleFactor: target.deviceScaleFactor,
        isMobile: target.isMobile,
        hasTouch: target.isMobile,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();

      // 1. Login
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole("heading", { name: "Sign in" }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await capture(page, dir, "01-login", { fullPage: false });

      await page.getByLabel("Email").fill(EMAIL);
      await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL("**/dashboard");

      // 2. Dashboard
      await page.getByRole("heading", { level: 1, name: "Dashboard" }).waitFor();
      await settle(page);
      await capture(page, dir, "02-dashboard");

      // 3. Doctors list
      await page.goto(`${BASE_URL}/doctors`);
      await page.getByRole("heading", { level: 1, name: "Doctors" }).waitFor();
      await settle(page);
      await capture(page, dir, "03-doctors");

      // 4. Add doctor dialog (the real form, opened and partly filled, never submitted)
      await page.getByRole("button", { name: "Add doctor" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Add doctor" });
      await dialog.waitFor();
      await dialog.getByLabel("Full name").fill("Dr. Nadia Rahman");
      await dialog.getByLabel("Specialization").fill("Cardiology");
      await page.waitForTimeout(400);
      await capture(page, dir, "04-add-doctor-dialog", { fullPage: false });

      // 5. Doctor detail
      const doctorId = await firstId(context, "doctors");
      await page.goto(`${BASE_URL}/doctors/${doctorId}`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await settle(page);
      await capture(page, dir, "05-doctor-detail");

      // 6. Patients list
      await page.goto(`${BASE_URL}/patients`);
      await page.getByRole("heading", { level: 1, name: "Patients" }).waitFor();
      await settle(page);
      await capture(page, dir, "06-patients");

      // 7. Edit patient dialog
      await page
        .getByRole("button", { name: /^Actions for / })
        .first()
        .click();
      await page.getByRole("menuitem", { name: "Edit" }).click();
      await page.getByRole("dialog", { name: "Edit patient" }).waitFor();
      await page.waitForTimeout(400);
      await capture(page, dir, "07-edit-patient-dialog", { fullPage: false });
      await page.getByRole("button", { name: "Cancel" }).click();

      // 8. Patient detail
      const patientId = await firstId(context, "patients");
      await page.goto(`${BASE_URL}/patients/${patientId}`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await settle(page);
      await capture(page, dir, "08-patient-detail");

      // 9. Dark-mode dashboard (set through the app's own theme switcher)
      await page.goto(`${BASE_URL}/dashboard`);
      await page.getByRole("heading", { level: 1, name: "Dashboard" }).waitFor();
      await page.getByRole("button", { name: "Change theme" }).click();
      await page.getByRole("menuitemradio", { name: "Dark" }).click();
      await page.keyboard.press("Escape");
      await settle(page);
      await capture(page, dir, "09-dashboard-dark");

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
