// Temporary QA exploration helper (deleted after use): dumps the interactive surface of each page.
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const API = "http://localhost:5000/api";
const browser = await chromium.launch();
const viewports = process.argv[2] === "mobile" ? [{ width: 390, height: 844 }] : [{ width: 1440, height: 900 }];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill("admin@doctortracker.dev");
  await page.getByRole("textbox", { name: "Password" }).fill("Admin@12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/dashboard/);
  const d = await (await page.request.get(`${API}/doctors?limit=1&sortBy=name&sortOrder=asc`)).json();
  const p = await (await page.request.get(`${API}/patients?limit=1&sortBy=name&sortOrder=asc`)).json();
  const pages = ["/dashboard", "/doctors", `/doctors/${d.data[0].id}`, "/patients", `/patients/${p.data[0].id}`, "/settings"];
  for (const path of pages) {
    await page.goto(BASE + path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    const dump = await page.evaluate(() => {
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
      };
      const name = (el) =>
        (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 60);
      const q = (sel) => [...document.querySelectorAll(sel)].filter(vis);
      return {
        h1: q("h1").map((e) => e.innerText),
        h2: q("h2").map((e) => e.innerText),
        landmarks: q("header,nav,main,aside,footer,[role=banner],[role=navigation],[role=main],[role=region],section[aria-label],section[aria-labelledby]").map(
          (e) => `${e.tagName.toLowerCase()}${e.getAttribute("role") ? `[${e.getAttribute("role")}]` : ""}:${e.getAttribute("aria-label") ?? e.getAttribute("aria-labelledby") ?? ""}`,
        ),
        buttons: q("button,[role=button],[role=combobox],[role=radio],[role=tab]").map((e) => `${e.getAttribute("role") ?? "button"}|${name(e)}|${e.disabled ? "disabled" : ""}|${e.getAttribute("aria-haspopup") ?? ""}`),
        links: [...new Set(q("a[href]").map((e) => `${name(e)} -> ${e.getAttribute("href")}`))].slice(0, 40),
        inputs: q("input,textarea,select").map((e) => `${e.tagName.toLowerCase()}[${e.type}] id=${e.id} label=${e.labels?.[0]?.innerText ?? ""} aria=${e.getAttribute("aria-label") ?? ""}`),
        th: q("th").map((e) => `${e.innerText.trim()}|${e.getAttribute("aria-sort") ?? ""}`),
        testids: [...new Set([...document.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid")))],
      };
    });
    console.log(`\n##### ${viewport.width} ${path}\n${JSON.stringify(dump, null, 1)}`);
  }
  await context.close();
}
await browser.close();
