import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@doctortracker.dev";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin@12345";
export const API_URL = (process.env.E2E_API_URL ?? "http://localhost:5000/api").replace(/\/+$/, "");
const APP_ORIGIN = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").origin;

/** Every record a test creates carries this marker, so leftovers are easy to find and remove. */
export const E2E_MARKER = "E2E";

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

export type DoctorSeed = {
  id: string;
  name: string;
  email: string;
  specialization: string;
  hospital: string;
};

type Envelope<T> = { success: boolean; data: T; pagination?: { total: number } };

/** Fills the login form and waits for the dashboard. */
export async function signIn(page: Page, next = "/dashboard"): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === next);
}

/**
 * Thin API client for test setup and clean-up. It reuses the browser context's cookies
 * (session + CSRF secret) and follows the contract's CSRF flow.
 */
export class ApiHelper {
  private csrfToken: string | null = null;

  constructor(private readonly request: APIRequestContext) {}

  private async csrf(): Promise<string> {
    if (!this.csrfToken) {
      const response = await this.request.get(`${API_URL}/auth/csrf-token`);
      expect(response.ok(), "csrf-token request").toBeTruthy();
      const body = (await response.json()) as Envelope<{ csrfToken: string }>;
      this.csrfToken = body.data.csrfToken;
    }
    return this.csrfToken;
  }

  private async headers(): Promise<Record<string, string>> {
    return { "X-CSRF-Token": await this.csrf(), Origin: APP_ORIGIN };
  }

  async get<T>(path: string): Promise<Envelope<T>> {
    const response = await this.request.get(`${API_URL}${path}`);
    expect(response.ok(), `GET ${path}`).toBeTruthy();
    return (await response.json()) as Envelope<T>;
  }

  async createDoctor(label: string): Promise<DoctorSeed> {
    const suffix = uniqueSuffix();
    const data = {
      name: `${E2E_MARKER} ${label} ${suffix}`,
      specialization: "Cardiology",
      hospital: `${E2E_MARKER} Hospital`,
      phone: "+880 1700 000000",
      email: `e2e.${suffix.toLowerCase()}@example.test`,
    };
    const response = await this.request.post(`${API_URL}/doctors`, { data, headers: await this.headers() });
    expect(response.status(), "create doctor").toBe(201);
    const body = (await response.json()) as Envelope<DoctorSeed>;
    return body.data;
  }

  async deleteDoctor(id: string): Promise<void> {
    await this.request.delete(`${API_URL}/doctors/${id}`, { headers: await this.headers() });
  }

  async deletePatient(id: string): Promise<void> {
    await this.request.delete(`${API_URL}/patients/${id}`, { headers: await this.headers() });
  }

  /** Removes a doctor and whatever patients are still assigned to it. Never throws. */
  async purgeDoctor(id: string): Promise<void> {
    try {
      const patients = await this.request.get(`${API_URL}/doctors/${id}/patients?limit=100`);
      if (patients.ok()) {
        const body = (await patients.json()) as Envelope<{ id: string }[]>;
        for (const patient of body.data) await this.deletePatient(patient.id);
      }
      await this.deleteDoctor(id);
    } catch {
      // Best-effort clean-up.
    }
  }

  /** Safety net: removes every doctor (and their patients) whose name carries the E2E marker. */
  async purgeLeftovers(): Promise<void> {
    const response = await this.request.get(
      `${API_URL}/doctors?search=${encodeURIComponent(`${E2E_MARKER} `)}&limit=100`,
    );
    if (!response.ok()) return;
    const body = (await response.json()) as Envelope<{ id: string; name: string }[]>;
    for (const doctor of body.data) {
      if (doctor.name.startsWith(`${E2E_MARKER} `)) await this.purgeDoctor(doctor.id);
    }
  }
}

/** Opens the mobile filter sheet when the layout has one; a no-op on tablet and desktop. */
export async function openFilters(page: Page): Promise<boolean> {
  const button = page.getByRole("button", { name: /^Filters/ });
  if (await button.isVisible()) {
    await button.click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    return true;
  }
  return false;
}

export async function closeFilters(page: Page, wasOpened: boolean): Promise<void> {
  if (!wasOpened) return;
  await page.getByRole("button", { name: "Show results" }).click();
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeHidden();
}

/** Types into a list search box and waits for the debounced value to reach the URL. */
export async function searchFor(page: Page, label: string, text: string): Promise<void> {
  await page.getByRole("searchbox", { name: label }).fill(text);
  await expect(page).toHaveURL((url) => url.searchParams.get("search") === text);
}

/** The page must never scroll sideways. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
  });
  expect(overflow.scrollWidth, "document must not be wider than the viewport").toBeLessThanOrEqual(
    overflow.clientWidth + 1,
  );
}

/** Collects console errors and uncaught exceptions for a page. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}
