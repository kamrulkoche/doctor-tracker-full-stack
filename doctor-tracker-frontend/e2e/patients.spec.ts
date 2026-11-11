import { expect, test } from "./fixtures";

import { ApiHelper, closeFilters, E2E_MARKER, openFilters, uniqueSuffix } from "./helpers";

test.describe("patients", () => {
  test("add a patient under a doctor, reassign it, then delete it", async ({ page }) => {
    const api = new ApiHelper(page.request);
    const doctorA = await api.createDoctor("Alpha");
    const doctorB = await api.createDoctor("Beta");
    const patientName = `${E2E_MARKER} Patient ${uniqueSuffix()}`;

    try {
      // Create under doctor A: the doctor is pre-selected and locked.
      await page.goto(`/doctors/${doctorA.id}`);
      await expect(page.getByRole("heading", { level: 1, name: doctorA.name })).toBeVisible();
      await expect(page.getByText("No patients assigned")).toBeVisible();

      await page.getByRole("button", { name: "Add patient" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Add patient" });
      await expect(dialog.getByRole("combobox", { name: "Assigned doctor" })).toBeDisabled();
      await expect(dialog.getByRole("combobox", { name: "Assigned doctor" })).toContainText(doctorA.name);
      await dialog.getByLabel("Full name").fill(patientName);
      await dialog.getByLabel("Condition").fill("Hypertension");
      await dialog.getByLabel("Age").fill("42");
      await dialog.getByLabel("Notes").fill("Created by the end-to-end suite.");
      await dialog.getByRole("button", { name: "Add patient" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText("Patient added")).toBeVisible();

      // It appears in that doctor's list and the count updates.
      await expect(page.getByRole("link", { name: patientName, exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Patients (1)" })).toBeVisible();

      // Reassign to doctor B through the focused dialog (async combobox).
      await page.getByRole("button", { name: `Actions for ${patientName}` }).click();
      await page.getByRole("menuitem", { name: "Reassign doctor" }).click();
      const reassign = page.getByRole("dialog", { name: "Change assigned doctor" });
      await expect(reassign).toContainText(doctorA.name);
      await reassign.getByRole("combobox", { name: "New doctor" }).click();
      await page.getByPlaceholder("Search doctors by name").fill(doctorB.name);
      await page.getByRole("option", { name: new RegExp(doctorB.name) }).click();
      await reassign.getByRole("button", { name: "Reassign patient" }).click();
      await expect(reassign).toBeHidden();
      await expect(page.getByText("Patient reassigned")).toBeVisible();

      // Gone from A (targeted invalidation), present under B.
      await expect(page.getByRole("link", { name: patientName, exact: true })).toHaveCount(0);
      await expect(page.getByText("No patients assigned")).toBeVisible();

      await page.goto(`/doctors/${doctorB.id}`);
      await expect(page.getByRole("link", { name: patientName, exact: true })).toBeVisible();

      // The patient detail page shows every field and links back to the doctor.
      await page.getByRole("link", { name: patientName, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: patientName })).toBeVisible();
      await expect(page.getByText("Created by the end-to-end suite.")).toBeVisible();
      await expect(page.getByRole("link", { name: doctorB.name }).first()).toBeVisible();

      // Delete from the detail page; the app returns to the patients list.
      const menu = page.getByRole("button", { name: `Actions for ${patientName}` });
      if (await menu.isVisible()) {
        await menu.click();
        await page.getByRole("menuitem", { name: "Delete" }).click();
      } else {
        await page.getByRole("button", { name: "Delete" }).click();
      }
      const confirm = page.getByRole("alertdialog", { name: `Delete ${patientName}?` });
      await confirm.getByRole("button", { name: "Delete" }).click();
      await expect(page).toHaveURL(/\/patients$/);
      await expect(page.getByText("Patient deleted")).toBeVisible();

      await page.goto(`/doctors/${doctorB.id}`);
      await expect(page.getByText("No patients assigned")).toBeVisible();
    } finally {
      await api.purgeDoctor(doctorA.id);
      await api.purgeDoctor(doctorB.id);
    }
  });

  test("filters, sorting and pagination update the URL and the results", async ({ page }) => {
    const api = new ApiHelper(page.request);
    const all = await api.get<unknown[]>("/patients?limit=10");
    const total = all.pagination?.total ?? 0;
    test.skip(total <= 10, "needs more than one page of patients (run the demo seed)");
    const { data: filters } = await api.get<{ conditions: string[] }>("/patients/filters");
    const condition = filters.conditions[0] as string;

    await page.goto("/patients");
    await expect(page.getByRole("heading", { level: 1, name: "Patients" })).toBeVisible();
    await expect(page.getByText(`Showing 1–10 of ${total.toLocaleString("en-GB")}`)).toBeVisible();

    // Pagination
    const firstRow = await page.locator("a[href^='/patients/']").first().textContent();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(page.getByText(/^Showing 11–/)).toBeVisible();
    await expect(page.locator("a[href^='/patients/']").first()).not.toHaveText(firstRow ?? "");

    // Changing a filter resets the page and narrows the results.
    const sheet = await openFilters(page);
    await page.getByRole("combobox", { name: "Condition" }).click();
    await page.getByRole("option", { name: condition, exact: true }).click();
    await closeFilters(page, sheet);
    await expect(page).toHaveURL((url) => url.searchParams.get("condition") === condition);
    await expect(page).not.toHaveURL(/[?&]page=/);
    const filtered = await api.get<unknown[]>(
      `/patients?condition=${encodeURIComponent(condition)}&limit=10`,
    );
    const filteredTotal = filtered.pagination?.total ?? 0;
    await expect(
      page.getByText(
        `${filteredTotal.toLocaleString("en-GB")} ${filteredTotal === 1 ? "patient" : "patients"} found`,
      ),
    ).toBeVisible();
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText(`Condition: ${condition}`);

    // The state survives a reload (it lives in the URL).
    await page.reload();
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText(`Condition: ${condition}`);

    // Page size
    await page.getByRole("combobox", { name: "Rows per page" }).click();
    await page.getByRole("option", { name: "20", exact: true }).click();
    await expect(page).toHaveURL(/[?&]limit=20/);

    // Removing the chip clears the filter.
    await page.getByRole("button", { name: `Remove filter Condition: ${condition}` }).click();
    await expect(page).not.toHaveURL(/condition=/);
    await expect(page.getByText(`Showing 1–20 of ${total.toLocaleString("en-GB")}`)).toBeVisible();

    // Back button restores the previous filter state.
    await page.goBack();
    await expect(page).toHaveURL((url) => url.searchParams.get("condition") === condition);
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText(`Condition: ${condition}`);
  });

  test("dashboard deep links are honoured", async ({ page }) => {
    const api = new ApiHelper(page.request);
    const { data: doctors } =
      await api.get<{ id: string; name: string; patientCount: number }[]>("/doctors?limit=50");
    const doctor = doctors.find((item) => item.patientCount > 0);
    test.skip(!doctor, "needs a doctor with patients (run the demo seed)");
    if (!doctor) return;

    await page.goto(`/patients?doctorId=${doctor.id}`);
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText(`Doctor: ${doctor.name}`);
    await expect(
      page.getByText(`${doctor.patientCount} ${doctor.patientCount === 1 ? "patient" : "patients"} found`),
    ).toBeVisible();
  });

  test("an unknown patient id shows a not-found state", async ({ page }) => {
    await page.goto("/patients/000000000000000000000000");
    await expect(page.getByTestId("not-found-state")).toContainText("Patient not found");
  });
});
