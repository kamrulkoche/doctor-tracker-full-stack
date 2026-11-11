import { expect, test } from "./fixtures";

import { ApiHelper, E2E_MARKER, searchFor, uniqueSuffix } from "./helpers";

test.describe("doctors", () => {
  test("create, search, edit and delete a doctor", async ({ page }) => {
    const suffix = uniqueSuffix();
    const name = `${E2E_MARKER} Doctor ${suffix}`;
    const renamed = `${E2E_MARKER} Doctor Renamed ${suffix}`;
    const email = `e2e.ui.${suffix.toLowerCase()}@example.test`;
    const api = new ApiHelper(page.request);

    try {
      await page.goto("/doctors");
      await expect(page.getByRole("heading", { level: 1, name: "Doctors" })).toBeVisible();

      // Create
      await page.getByRole("button", { name: "Add doctor" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Add doctor" });
      await expect(dialog).toBeVisible();

      // Client-side validation runs before any request.
      await dialog.getByRole("button", { name: "Add doctor" }).click();
      await expect(dialog.getByText("Name must be at least 2 characters")).toBeVisible();

      await dialog.getByLabel("Full name").fill(name);
      await dialog.getByLabel("Specialization").fill("Neurology");
      await dialog.getByLabel("Hospital").fill(`${E2E_MARKER} Hospital`);
      await dialog.getByLabel("Phone").fill("+880 1711 223344");
      await dialog.getByLabel("Email").fill(email);
      await dialog.getByRole("button", { name: "Add doctor" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText("Doctor added")).toBeVisible();

      // Search (debounced, reflected in the URL)
      await searchFor(page, "Search doctors", suffix);
      await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
      await expect(page.getByText("1 doctor found")).toBeVisible();

      // A duplicate email is reported on the field, not in a toast.
      await page.getByRole("button", { name: "Add doctor" }).first().click();
      const duplicate = page.getByRole("dialog", { name: "Add doctor" });
      await duplicate.getByLabel("Full name").fill(`${name} Copy`);
      await duplicate.getByLabel("Specialization").fill("Neurology");
      await duplicate.getByLabel("Hospital").fill(`${E2E_MARKER} Hospital`);
      await duplicate.getByLabel("Phone").fill("+880 1711 223344");
      await duplicate.getByLabel("Email").fill(email);
      await duplicate.getByRole("button", { name: "Add doctor" }).click();
      await expect(duplicate.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
      await duplicate.getByRole("button", { name: "Cancel" }).click();
      await page.getByRole("button", { name: "Discard" }).click();
      await expect(duplicate).toBeHidden();

      // Edit
      await page.getByRole("button", { name: `Actions for ${name}` }).click();
      await page.getByRole("menuitem", { name: "Edit" }).click();
      const editDialog = page.getByRole("dialog", { name: "Edit doctor" });
      await expect(editDialog.getByLabel("Full name")).toHaveValue(name);
      await editDialog.getByLabel("Full name").fill(renamed);
      await editDialog.getByRole("button", { name: "Save changes" }).click();
      await expect(editDialog).toBeHidden();
      await expect(page.getByRole("link", { name: renamed, exact: true })).toBeVisible();

      // Delete
      await page.getByRole("button", { name: `Actions for ${renamed}` }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      const confirm = page.getByRole("alertdialog", { name: `Delete ${renamed}?` });
      await expect(confirm).toBeVisible();
      await confirm.getByRole("button", { name: "Delete" }).click();
      await expect(confirm).toBeHidden();
      await expect(page.getByText("No doctors match your filters")).toBeVisible();
    } finally {
      await api.purgeLeftovers();
    }
  });

  test("deleting a doctor who still has patients is blocked with an explanation", async ({ page }) => {
    const api = new ApiHelper(page.request);
    const doctor = await api.createDoctor("Blocked");

    try {
      // Give the doctor one patient through the UI, on the doctor's own page.
      await page.goto(`/doctors/${doctor.id}`);
      await expect(page.getByRole("heading", { level: 1, name: doctor.name })).toBeVisible();
      await page.getByRole("button", { name: "Add patient" }).first().click();
      const addDialog = page.getByRole("dialog", { name: "Add patient" });
      await addDialog.getByLabel("Full name").fill(`${E2E_MARKER} Patient ${uniqueSuffix()}`);
      await addDialog.getByLabel("Condition").fill("Asthma");
      await addDialog.getByRole("button", { name: "Add patient" }).click();
      await expect(addDialog).toBeHidden();
      await expect(page.getByRole("heading", { level: 2, name: "Patients (1)" })).toBeVisible();

      // Try to delete from the list.
      await page.goto(`/doctors?search=${encodeURIComponent(doctor.name)}`);
      await page.getByRole("button", { name: `Actions for ${doctor.name}` }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();

      const blocked = page.getByRole("alertdialog");
      await expect(blocked).toContainText("can't be deleted yet");
      await expect(blocked).toContainText("1 assigned patient");
      await expect(blocked).toContainText(/reassign or remove/i);
      await expect(blocked.getByRole("button", { name: "Delete" })).toHaveCount(0);

      // The explanation links to exactly that doctor's patients.
      await blocked.getByRole("link", { name: "View this doctor's patients" }).click();
      await expect(page).toHaveURL(new RegExp(`/patients\\?doctorId=${doctor.id}`));
      await expect(page.getByText("1 patient found")).toBeVisible();
    } finally {
      await api.purgeDoctor(doctor.id);
    }
  });

  test("an unknown doctor id shows a not-found state", async ({ page }) => {
    await page.goto("/doctors/000000000000000000000000");
    await expect(page.getByTestId("not-found-state")).toContainText("Doctor not found");
    await page.goto("/doctors/not-an-id");
    await expect(page.getByTestId("not-found-state")).toContainText("Doctor not found");
    await page.getByTestId("not-found-state").getByRole("link", { name: "Back to doctors" }).click();
    await expect(page).toHaveURL(/\/doctors$/);
  });
});
